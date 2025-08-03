from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
from pathlib import Path
import sys

# Allow importing db_utils
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils  # type: ignore


class FlowRun(BaseModel):
    id: str
    flow_id: str
    status: Optional[str] = None
    output: Optional[Any] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None


router = APIRouter(tags=["flow_runs"])


@router.get("/flows/{flow_id}/runs", response_model=List[FlowRun], summary="List runs for a flow")
def list_flow_runs(flow_id: str, status: Optional[str] = None) -> List[FlowRun]:
    runs = db_utils.get_flow_runs(flow_id, status)
    return [FlowRun(**run) for run in runs]


@router.get("/flow-runs/{run_id}", response_model=FlowRun, summary="Get a flow run by ID")
def get_flow_run(run_id: str) -> FlowRun:
    run = db_utils.get_flow_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Flow run not found")
    return FlowRun(**run)
