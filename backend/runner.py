import asyncio
import json
from typing import Any, AsyncGenerator, Callable, Dict, List

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from .flows import Edge, Flow, Node

from pathlib import Path
import sys

# Import db_utils from app folder
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils  # type: ignore

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


def _build_crewai_objects(flow: Flow) -> Dict[str, Any]:
    """Instantiate CrewAI objects for tools, agents and tasks."""
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
                if getattr(agent, "tools", None) is None:
                    agent.tools = []
                agent.tools.append(tools[edge.source])
        elif src.type == "agent" and tgt.type == "task":
            task = tasks.get(tgt.id)
            if task is not None:
                task.agent = agents[edge.source]

    ordered_nodes = _topological_sort(flow.nodes, flow.edges)
    ordered_tasks = [tasks[n.id] for n in ordered_nodes if n.id in tasks]
    crew = Crew(agents=list(agents.values()), tasks=ordered_tasks, verbose=True)
    return {"crew": crew, "tasks": ordered_tasks, "agents": agents}


async def _run_flow(flow: Flow, callback: Callable[[str, Dict[str, Any]], Any]) -> Any:
    objects = _build_crewai_objects(flow)
    crew = objects["crew"]
    await callback("start", {"tasks": [t.description for t in objects["tasks"]]})
    try:
        result = await asyncio.to_thread(crew.kickoff)
    except Exception as exc:  # pragma: no cover - best effort
        result = {"error": str(exc)}
    await callback("completed", {"result": result})
    return result


async def _event_stream(flow: Flow) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue = asyncio.Queue()

    async def cb(event: str, data: Dict[str, Any]):
        await queue.put({"event": event, "data": data})

    async def runner():
        try:
            await _run_flow(flow, cb)
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
    return StreamingResponse(_event_stream(flow), media_type="text/event-stream")
