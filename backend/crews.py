from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from pathlib import Path
import sys
import uuid
from datetime import datetime

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

router = APIRouter()

class CrewCreate(BaseModel):
    name: str

class CrewUpdate(BaseModel):
    name: Optional[str] = None
    process: Optional[str] = None
    verbose: Optional[bool] = None
    agent_ids: Optional[List[str]] = None
    task_ids: Optional[List[str]] = None
    memory: Optional[bool] = None
    cache: Optional[bool] = None
    planning: Optional[bool] = None
    max_rpm: Optional[int] = None
    manager_llm: Optional[str] = None
    manager_agent_id: Optional[str] = None
    knowledge_source_ids: Optional[List[str]] = None

class CrewResponse(BaseModel):
    id: str
    name: str
    agent_count: int
    task_count: int

class CrewDetailResponse(BaseModel):
    id: str
    name: str
    process: str
    verbose: bool
    agent_ids: List[str]
    task_ids: List[str]
    memory: bool
    cache: bool
    planning: bool
    max_rpm: int
    manager_llm: Optional[str]
    manager_agent_id: Optional[str]
    knowledge_source_ids: List[str]

class CrewRunRequest(BaseModel):
    inputs: Dict[str, str] = {}

class CrewRunResponse(BaseModel):
    id: str
    crew_id: str
    crew_name: str
    created_at: str

@router.get("/", response_model=List[CrewResponse], summary="Get all crews")
async def get_crews():
    """Get all crews from the database."""
    try:
        # Get raw crew data from database without loading agents/tasks
        rows = db_utils.load_entities('crew')
        crews_list = []
        for row in rows:
            crew_id = row[0]
            crew_data = row[1]
            crews_list.append({
                "id": crew_id,
                "name": crew_data.get('name', 'Unnamed Crew'),
                "agent_count": len(crew_data.get('agent_ids', []) or []),
                "task_count": len(crew_data.get('task_ids', []) or []),
            })
        return crews_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load crews: {str(e)}")

@router.post("/", response_model=CrewResponse, summary="Create a new crew")
async def create_crew(crew_data: CrewCreate):
    """Create a new crew.

    Avoids importing Streamlit/MyCrew; writes a minimal, valid crew entity directly.
    """
    try:
        crew_id = "C_" + uuid.uuid4().hex[:8]
        created_at = datetime.now().isoformat()
        # Minimal initial crew payload compatible with db_utils
        data = {
            "name": crew_data.name,
            "process": "sequential",  # store as string to avoid JSON/Enum issues
            "verbose": True,
            "agent_ids": [],
            "task_ids": [],
            "memory": False,
            "cache": True,
            "planning": False,
            "max_rpm": 1000,
            "manager_llm": None,
            "manager_agent_id": None,
            "created_at": created_at,
            "knowledge_source_ids": [],
        }
        db_utils.save_entity("crew", crew_id, data)
        return {"id": crew_id, "name": crew_data.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create crew: {str(e)}")

@router.get("/{crew_id}", response_model=CrewDetailResponse, summary="Get a crew by ID")
async def get_crew(crew_id: str):
    """Get a specific crew by ID."""
    try:
        rows = db_utils.load_entities('crew')
        for row in rows:
            if row[0] == crew_id:
                crew_data = row[1]
                return CrewDetailResponse(
                    id=crew_id,
                    name=crew_data.get('name', 'Unnamed Crew'),
                    process=crew_data.get('process', 'sequential'),
                    verbose=bool(crew_data.get('verbose', True)),
                    agent_ids=crew_data.get('agent_ids', []),
                    task_ids=crew_data.get('task_ids', []),
                    memory=bool(crew_data.get('memory', False)),
                    cache=bool(crew_data.get('cache', True)),
                    planning=bool(crew_data.get('planning', False)),
                    max_rpm=int(crew_data.get('max_rpm', 1000)),
                    manager_llm=crew_data.get('manager_llm'),
                    manager_agent_id=crew_data.get('manager_agent_id'),
                    knowledge_source_ids=crew_data.get('knowledge_source_ids', []),
                )
        raise HTTPException(status_code=404, detail="Crew not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load crew: {str(e)}")

@router.put("/{crew_id}", response_model=CrewDetailResponse, summary="Update a crew")
async def update_crew(crew_id: str, crew_update: CrewUpdate):
    """Update a crew's information."""
    try:
        rows = db_utils.load_entities('crew')
        matched = next((r for r in rows if r[0] == crew_id), None)
        if not matched:
            raise HTTPException(status_code=404, detail="Crew not found")

        crew_data = matched[1]
        incoming = crew_update.dict(exclude_unset=True)
        # Merge while preserving unknown future fields
        for k, v in incoming.items():
            crew_data[k] = v

        db_utils.save_entity('crew', crew_id, crew_data)
        return await get_crew(crew_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update crew: {str(e)}")

@router.delete("/{crew_id}", status_code=204, summary="Delete a crew")
async def delete_crew(crew_id: str):
    """Delete a crew by ID."""
    try:
        db_utils.delete_crew(crew_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete crew: {str(e)}")


@router.post("/{crew_id}/run", response_model=CrewRunResponse, summary="Run a crew and save the result")
async def run_crew(crew_id: str, payload: CrewRunRequest | None = None):
    """Build the crew by ID, run it synchronously, save the result, and return a result id."""
    try:
        # Load crews and locate the specific crew
        from my_crew import MyCrew  # type: ignore
        from result import Result  # type: ignore
        from utils import format_result  # type: ignore

        all_crews = db_utils.load_crews()
        crew_obj: Optional[MyCrew] = next((c for c in all_crews if c.id == crew_id), None)
        if not crew_obj:
            raise HTTPException(status_code=404, detail="Crew not found")

        # Basic validation
        if not crew_obj.agents or not crew_obj.tasks:
            raise HTTPException(status_code=400, detail="Crew must have at least one agent and one task")
        missing_agent = [t.id for t in crew_obj.tasks if not getattr(t, 'agent', None)]
        if missing_agent:
            raise HTTPException(status_code=400, detail=f"Tasks missing agent assignment: {', '.join(missing_agent)}")

        # Preflight LLM configuration validation to avoid 500s
        missing_env: list[str] = []
        from llms import load_secrets_fron_env  # type: ignore
        load_secrets_fron_env()
        import os
        for ag in crew_obj.agents:
            provider = None
            try:
                provider = (ag.llm_provider_model.split(":", 1)[0] or "").strip()
            except Exception:
                provider = ""
            if provider == "OpenAI":
                if not os.getenv("OPENAI_API_KEY"):
                    missing_env.append("OPENAI_API_KEY (for OpenAI)")
            elif provider == "Groq":
                if not os.getenv("GROQ_API_KEY"):
                    missing_env.append("GROQ_API_KEY (for Groq)")
            elif provider == "Anthropic":
                if not os.getenv("ANTHROPIC_API_KEY"):
                    missing_env.append("ANTHROPIC_API_KEY (for Anthropic)")
            elif provider == "Ollama":
                if not os.getenv("OLLAMA_HOST"):
                    missing_env.append("OLLAMA_HOST (for Ollama)")
            elif provider == "Xai":
                if not os.getenv("XAI_API_KEY"):
                    missing_env.append("XAI_API_KEY (for Xai)")
        if missing_env:
            details = ", ".join(sorted(set(missing_env)))
            raise HTTPException(status_code=400, detail=f"Missing required environment variables: {details}")

        # Build CrewAI crew and run
        crewai_crew = crew_obj.get_crewai_crew()
        raw = crewai_crew.kickoff()
        formatted = format_result(raw)

        # Save result
        res_id = "R_" + uuid.uuid4().hex[:8]
        inputs = (payload.inputs if payload else {})
        res = Result(id=res_id, crew_id=crew_obj.id, crew_name=crew_obj.name, inputs=inputs, result=formatted)
        db_utils.save_result(res)

        return CrewRunResponse(id=res_id, crew_id=crew_obj.id, crew_name=crew_obj.name, created_at=res.created_at)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run crew: {str(e)}")
