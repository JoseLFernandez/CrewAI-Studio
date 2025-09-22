from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from pathlib import Path
import sys

# Import app-layer db_utils
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils  # type: ignore

router = APIRouter()


class ResultSummary(BaseModel):
    id: str
    crew_id: str
    crew_name: str
    created_at: str


class ResultDetail(ResultSummary):
    inputs: Dict[str, str]
    result: Any


@router.get("/", response_model=List[ResultSummary], summary="List results")
async def list_results():
    try:
        items = db_utils.load_results()
        return [
            ResultSummary(id=r.id, crew_id=r.crew_id, crew_name=r.crew_name, created_at=r.created_at)
            for r in items
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{result_id}", response_model=ResultDetail, summary="Get a result")
async def get_result(result_id: str):
    try:
        items = db_utils.load_results()
        for r in items:
            if r.id == result_id:
                return ResultDetail(
                    id=r.id,
                    crew_id=r.crew_id,
                    crew_name=r.crew_name,
                    created_at=r.created_at,
                    inputs=r.inputs,
                    result=r.result,
                )
        raise HTTPException(status_code=404, detail="Result not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{result_id}", status_code=204, summary="Delete a result")
async def delete_result(result_id: str):
    try:
        db_utils.delete_result(result_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
