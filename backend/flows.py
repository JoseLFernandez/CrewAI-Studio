from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import uuid4
from pathlib import Path
import sys

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils


class Position(BaseModel):
    x: float
    y: float


class Node(BaseModel):
    id: str
    type: str
    position: Position
    data: Dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class Flow(BaseModel):
    id: str
    name: Optional[str] = None
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)


class FlowCreate(BaseModel):
    name: Optional[str] = None
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)


router = APIRouter(prefix="/flows", tags=["flows"])

@router.get("", response_model=List[Flow], summary="List all flows")
def list_flows() -> List[Flow]:
    """List all stored flows."""
    items = db_utils.load_flows()
    flows: List[Flow] = []
    for item in items:
        # item already has id and may include name/nodes/edges
        flows.append(Flow(id=item.get("id"), name=item.get("name"), nodes=[Node(**n) for n in item.get("nodes", [])], edges=[Edge(**e) for e in item.get("edges", [])]))
    return flows


@router.post("", response_model=Flow, summary="Create a new flow")
def create_flow(flow: FlowCreate) -> Flow:
    """Persist a flow and return it with a generated ID."""
    flow_id = str(uuid4())
    data = flow.dict()
    db_utils.save_flow(flow_id, data)
    return Flow(id=flow_id, **data)


@router.get("/{flow_id}", response_model=Flow, summary="Get a flow by ID")
def get_flow(flow_id: str) -> Flow:
    """Retrieve a flow by its identifier."""
    data = db_utils.load_flow(flow_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    return Flow(id=flow_id, **data)


@router.put("/{flow_id}", response_model=Flow, summary="Update a flow")
def update_flow(flow_id: str, flow: FlowCreate) -> Flow:
    """Update an existing flow's definition."""
    existing = db_utils.load_flow(flow_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    data = flow.dict()
    db_utils.save_flow(flow_id, data)
    return Flow(id=flow_id, **data)


@router.delete("/{flow_id}", status_code=204, summary="Delete a flow")
def delete_flow(flow_id: str) -> Response:
    """Remove a flow from the database."""
    data = db_utils.load_flow(flow_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    db_utils.delete_flow(flow_id)
    return Response(status_code=204)
