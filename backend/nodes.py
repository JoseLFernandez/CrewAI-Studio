from typing import Any, Dict, List
from fastapi import APIRouter
from pydantic import BaseModel

from .plugins import load_plugins

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

def _serialize_nodes() -> List[Dict[str, Any]]:
    return [{"type": node_type, **spec.dict()} for node_type, spec in NODE_REGISTRY.items()]

# Built-in nodes
register_node("tool", label="Tool", schema={"type": "object", "properties": {}}, icon="🛠️")
register_node("agent", label="Agent", schema={"type": "object", "properties": {}}, icon="🤖")
register_node("task", label="Task", schema={"type": "object", "properties": {}}, icon="📌")

# Load plugin-defined nodes
load_plugins(register_node)

@router.get("/nodes")
def list_nodes() -> List[Dict[str, Any]]:
    """Return a list of registered node types."""
    return _serialize_nodes()

@router.get("/plugins")
def list_plugins() -> List[Dict[str, Any]]:
    """Return all nodes, including those provided by plugins."""
    return _serialize_nodes()
