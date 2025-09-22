import asyncio
import json
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional, Tuple
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from .flows import Edge, Flow, Node
from .websocket import broadcast_log

from pathlib import Path
import sys

# Import db_utils and ConsoleCapture from app folder
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils  # type: ignore
from console_capture import ConsoleCapture  # type: ignore

router = APIRouter(prefix="/flows", tags=["flows"])


def _topological_sort(nodes: List[Node], edges: List[Edge]) -> List[Node]:
    """Return nodes sorted in topological order based on edges."""
    incoming: Dict[str, int] = {node.id: 0 for node in nodes}
    outgoing: Dict[str, List[str]] = {node.id: [] for node in nodes}
    for edge in edges:
        outgoing[edge.source].append(edge.target)
        incoming[edge.target] += 1

    queue: List[Node] = [n for n in nodes if incoming[n.id] == 0]
    ordered: List[Node] = []
    while queue:
        node = queue.pop(0)
        ordered.append(node)
        for target in outgoing[node.id]:
            incoming[target] -= 1
            if incoming[target] == 0:
                queue.append(next(n for n in nodes if n.id == target))
    return ordered


def _build_crewai_objects(flow: Flow, task_sequence: Optional[List[str]] = None) -> Dict[str, Any]:
    """Instantiate CrewAI objects for tools, agents and tasks.

    If task_sequence is provided, only include those tasks and preserve that order.
    """
    from crewai import Agent, Task, Crew

    node_map: Dict[str, Node] = {n.id: n for n in flow.nodes}
    tools: Dict[str, Any] = {}
    agents: Dict[str, Agent] = {}
    tasks: Dict[str, Task] = {}

    for node in flow.nodes:
        if node.type == "tool":
            # Tools are simple dictionaries used to attach to agents later
            tools[node.id] = node.data
        elif node.type == "agent":
            data = node.data or {}
            agents[node.id] = Agent(
                role=data.get("role", node.id),
                goal=data.get("goal", data.get("label", "")),
                backstory=data.get("backstory", ""),
                verbose=data.get("verbose", False),
            )
        elif node.type == "task":
            # agent will be attached later once edges are processed
            data = node.data or {}
            tasks[node.id] = Task(
                description=data.get("description", data.get("label", "")),
                expected_output=data.get("expected_output", ""),
                agent=None,  # type: ignore
            )

    # Attach tools to agents and agents to tasks using edges
    for edge in flow.edges:
        src = node_map[edge.source]
        tgt = node_map[edge.target]
        if src.type == "tool" and tgt.type == "agent":
            agent = agents.get(tgt.id)
            if agent is not None:
                existing_tools = getattr(agent, "tools", []) or []
                setattr(agent, "tools", existing_tools)
                existing_tools.append(tools[edge.source])
        elif src.type == "agent" and tgt.type == "task":
            task = tasks.get(tgt.id)
            if task is not None:
                task.agent = agents[edge.source]

    if task_sequence:
        ordered_tasks = [tasks[tid] for tid in task_sequence if tid in tasks]
    else:
        ordered_nodes = _topological_sort(flow.nodes, flow.edges)
        ordered_tasks = [tasks[n.id] for n in ordered_nodes if n.id in tasks]
    crew = Crew(agents=list(agents.values()), tasks=ordered_tasks, verbose=True)
    return {"crew": crew, "tasks": ordered_tasks, "agents": agents}


def _find_start_node(nodes: List[Node], edges: List[Edge]) -> Optional[Node]:
    start = next((n for n in nodes if n.type == "start"), None)
    if start:
        return start
    # fallback to zero incoming degree
    incoming: Dict[str, int] = {n.id: 0 for n in nodes}
    for e in edges:
        incoming[e.target] = incoming.get(e.target, 0) + 1
    zero_in = [n for n in nodes if incoming.get(n.id, 0) == 0]
    return zero_in[0] if zero_in else (nodes[0] if nodes else None)


def _truthy(s: Any) -> bool:
    if isinstance(s, bool):
        return s
    if s is None:
        return False
    if isinstance(s, (int, float)):
        return s != 0
    text = str(s).strip().lower()
    return text in {"1", "true", "yes", "y", "on"}


def _safe_eval_bool(expr: str, ctx: Dict[str, Any]) -> bool:
    try:
        val = eval(expr, {"__builtins__": {}}, dict(ctx))  # nosec: B307 (restricted env)
        return _truthy(val)
    except Exception:
        return False


def _build_adjacency(nodes: List[Node], edges: List[Edge]) -> Dict[str, List[Edge]]:
    adj: Dict[str, List[Edge]] = {n.id: [] for n in nodes}
    for e in edges:
        if e.source in adj:
            adj[e.source].append(e)
    return adj


def _traverse_for_tasks(flow: Flow) -> Tuple[List[str], List[str]]:
    """Traverse the graph following IF conditions and collect task node IDs in order.

    Returns (tasks_order, visited_node_ids)
    """
    node_map: Dict[str, Node] = {n.id: n for n in flow.nodes}
    adj = _build_adjacency(flow.nodes, flow.edges)
    current = _find_start_node(flow.nodes, flow.edges)
    if not current:
        return ([], [])

    ctx: Dict[str, Any] = {}
    tasks_order: List[str] = []
    visited: List[str] = []

    # guard against cycles
    max_steps = max(1, len(flow.nodes) * 3)
    steps = 0
    while current and steps < max_steps:
        steps += 1
        visited.append(current.id)
        edges_out = adj.get(current.id, [])

        # Collect task nodes (only once)
        if current.type == "task" and current.id not in tasks_order:
            tasks_order.append(current.id)

        # Mutate simple context for control nodes
        if current.type == "set":
            fields = (current.data or {}).get("fields", {})
            if isinstance(fields, dict):
                ctx.update(fields)

        # Choose next node
        next_id: Optional[str] = None
        if current.type == "if":
            expr = (current.data or {}).get("expression", "")
            truthy = _safe_eval_bool(expr, ctx) if expr else False
            # match edge by condition label
            preferred = "true" if truthy else "false"
            match = next(
                (e for e in edges_out if str((e.data or {}).get("condition", "")).strip().lower() == preferred),
                None,
            )
            if not match and edges_out:
                # fallback: if two edges, pick first for true, second for false
                if len(edges_out) >= 2:
                    match = edges_out[0] if truthy else edges_out[1]
                else:
                    match = edges_out[0]
            next_id = match.target if match else None
        else:
            # default: first outgoing edge
            next_id = edges_out[0].target if edges_out else None

        current = node_map.get(next_id) if next_id else None

    return (tasks_order, visited)


async def _run_flow(flow: Flow, run_id: str, callback: Callable[[str, Dict[str, Any]], Any]) -> Any:
    # Determine tasks to execute based on branching
    task_ids, visited_nodes = _traverse_for_tasks(flow)
    objects = _build_crewai_objects(flow, task_sequence=task_ids if task_ids else None)
    crew = objects["crew"]
    await callback(
        "start",
        {
            "run_id": run_id,
            "tasks": [t.description for t in objects["tasks"]],
            "visited": visited_nodes,
        },
    )

    capture = ConsoleCapture()
    capture.start()
    finished = False

    async def log_worker() -> None:
        while not finished:
            for line in capture.get_output():
                await broadcast_log(run_id, line)
            await asyncio.sleep(0.1)

    worker = asyncio.create_task(log_worker())

    try:
        # Log chosen tasks
        await broadcast_log(run_id, f"Selected tasks order: {task_ids or 'all (topological)'}\n")
        result = await asyncio.to_thread(crew.kickoff)
    except Exception as exc:  # pragma: no cover - best effort
        result = {"error": str(exc)}
    finally:
        finished = True
        capture.stop()
        await worker

    await callback("completed", {"run_id": run_id, "result": result})
    return result


async def _event_stream(flow: Flow, run_id: str) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue = asyncio.Queue()

    async def cb(event: str, data: Dict[str, Any]):
        await queue.put({"event": event, "data": data})

    async def runner():
        try:
            result = await _run_flow(flow, run_id, cb)
            db_utils.update_flow_run(
                run_id,
                status="completed",
                output=result,
                finished_at=datetime.utcnow(),
            )
        except Exception as exc:  # pragma: no cover - best effort
            db_utils.update_flow_run(
                run_id,
                status="failed",
                output={"error": str(exc)},
                finished_at=datetime.utcnow(),
            )
        finally:
            await queue.put({"event": "end", "data": {}})

    asyncio.create_task(runner())

    while True:
        item = await queue.get()
        yield f"data: {json.dumps(item)}\n\n"
        if item["event"] == "end":
            break


@router.post("/{flow_id}/run", summary="Run a flow and stream results")
async def run_flow(flow_id: str) -> StreamingResponse:
    data = db_utils.load_flow(flow_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    flow = Flow(id=flow_id, **data)
    run_id = str(uuid4())
    db_utils.create_flow_run(run_id, flow_id)
    return StreamingResponse(
        _event_stream(flow, run_id), media_type="text/event-stream"
    )
