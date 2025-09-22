from backend.flows import Flow, Node, Edge, Position
from backend.runner import _traverse_for_tasks


def _pos(x: float, y: float) -> Position:
    return Position(x=x, y=y)


def test_traverse_if_true_branch():
    nodes = [
        Node(id="start", type="start", position=_pos(0, 0), data={}),
        Node(id="if1", type="if", position=_pos(100, 0), data={"expression": "flag"}),
        Node(id="set1", type="set", position=_pos(200, 0), data={"fields": {"flag": True}}),
        Node(id="taskT", type="task", position=_pos(300, 0), data={"description": "true task"}),
        Node(id="taskF", type="task", position=_pos(300, 100), data={"description": "false task"}),
    ]
    edges = [
        Edge(id="e0", source="start", target="set1", data={}),
        Edge(id="e1", source="set1", target="if1", data={}),
        Edge(id="e2", source="if1", target="taskT", data={"condition": "true"}),
        Edge(id="e3", source="if1", target="taskF", data={"condition": "false"}),
    ]
    flow = Flow(id="f1", name="t", nodes=nodes, edges=edges)
    tasks, visited = _traverse_for_tasks(flow)
    assert tasks == ["taskT"], f"Expected true branch, got {tasks} visited={visited}"


def test_traverse_if_false_branch():
    nodes = [
        Node(id="start", type="start", position=_pos(0, 0), data={}),
        Node(id="if1", type="if", position=_pos(100, 0), data={"expression": "x > 3"}),
        Node(id="taskT", type="task", position=_pos(300, 0), data={"description": "true task"}),
        Node(id="taskF", type="task", position=_pos(300, 100), data={"description": "false task"}),
    ]
    edges = [
        Edge(id="e0", source="start", target="if1", data={}),
        Edge(id="e2", source="if1", target="taskT", data={"condition": "true"}),
        Edge(id="e3", source="if1", target="taskF", data={"condition": "false"}),
    ]
    flow = Flow(id="f2", name="t", nodes=nodes, edges=edges)
    # No context defines x, so expression evaluates False
    tasks, visited = _traverse_for_tasks(flow)
    assert tasks == ["taskF"], f"Expected false branch, got {tasks} visited={visited}"


def test_traverse_fallback_without_conditions():
    nodes = [
        Node(id="start", type="start", position=_pos(0, 0), data={}),
        Node(id="if1", type="if", position=_pos(100, 0), data={"expression": "1 == 1"}),
        Node(id="t1", type="task", position=_pos(300, 0), data={}),
        Node(id="t2", type="task", position=_pos(300, 100), data={}),
    ]
    edges = [
        Edge(id="e0", source="start", target="if1", data={}),
        Edge(id="e2", source="if1", target="t1", data={}),
        Edge(id="e3", source="if1", target="t2", data={}),
    ]
    flow = Flow(id="f3", name="t", nodes=nodes, edges=edges)
    tasks, _ = _traverse_for_tasks(flow)
    # True branch with no labels should pick first edge
    assert tasks == ["t1"]
