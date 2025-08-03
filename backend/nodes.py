from typing import Any, Dict, List
from fastapi import APIRouter
from pydantic import BaseModel

class NodeSpec(BaseModel):
    label: str
    schema: Dict[str, Any]
    icon: str

# Internal registry of all available node types
NODE_REGISTRY: Dict[str, NodeSpec] = {}

router = APIRouter()

def register_node(node_type: str, *, label: str, schema: Dict[str, Any], icon: str) -> None:
    """Register a new node type.

    Args:
        node_type: Unique identifier for the node type.
        label: Human readable name displayed in the UI.
        schema: JSON schema describing the node configuration.
        icon: Icon (emoji or URL) used in the palette.
    """
    NODE_REGISTRY[node_type] = NodeSpec(label=label, schema=schema, icon=icon)

# Built-in nodes
register_node("tool", label="Tool", schema={"type": "object", "properties": {}}, icon="🛠️")
register_node("agent", label="Agent", schema={"type": "object", "properties": {}}, icon="🤖")
register_node("task", label="Task", schema={"type": "object", "properties": {}}, icon="📌")

@router.get("/nodes")
def list_nodes() -> List[Dict[str, Any]]:
    """Return a list of registered node types."""
    return [{"type": node_type, **spec.dict()} for node_type, spec in NODE_REGISTRY.items()]
