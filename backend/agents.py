from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app'))
from db_utils import load_entities, save_entity, delete_entity

router = APIRouter()

class AgentCreate(BaseModel):
    id: Optional[str] = None
    role: str
    backstory: str
    goal: str
    allow_delegation: bool = False
    verbose: bool = False
    cache: bool = True
    llm_provider_model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_iter: int = 15
    tool_ids: List[str] = []
    knowledge_source_ids: List[str] = []

class AgentUpdate(BaseModel):
    role: Optional[str] = None
    backstory: Optional[str] = None
    goal: Optional[str] = None
    allow_delegation: Optional[bool] = None
    verbose: Optional[bool] = None
    cache: Optional[bool] = None
    llm_provider_model: Optional[str] = None
    temperature: Optional[float] = None
    max_iter: Optional[int] = None
    tool_ids: Optional[List[str]] = None
    knowledge_source_ids: Optional[List[str]] = None

class AgentResponse(BaseModel):
    id: str
    role: str
    backstory: str
    goal: str
    allow_delegation: bool
    verbose: bool
    cache: bool
    llm_provider_model: str
    temperature: float
    max_iter: int
    tool_ids: List[str]
    knowledge_source_ids: List[str]
    created_at: str

@router.get("/", response_model=List[AgentResponse])
async def get_agents():
    try:
        # Get raw agent data from database without loading tools/knowledge
        rows = load_entities('agent')
        agents = []
        for row in rows:
            agent_data = row[1].copy()
            agent_data['id'] = row[0]
            agents.append(AgentResponse(**agent_data))
        return sorted(agents, key=lambda x: x.created_at)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    try:
        rows = load_entities('agent')
        for row in rows:
            if row[0] == agent_id:
                agent_data = row[1].copy()
                agent_data['id'] = row[0]
                return AgentResponse(**agent_data)
        raise HTTPException(status_code=404, detail="Agent not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate):
    try:
        import uuid
        from datetime import datetime
        
        agent_id = agent.id or str(uuid.uuid4())
        
        agent_data = {
            'created_at': datetime.now().isoformat(),
            'role': agent.role,
            'backstory': agent.backstory,
            'goal': agent.goal,
            'allow_delegation': agent.allow_delegation,
            'verbose': agent.verbose,
            'cache': agent.cache,
            'llm_provider_model': agent.llm_provider_model,
            'temperature': agent.temperature,
            'max_iter': agent.max_iter,
            'tool_ids': agent.tool_ids,
            'knowledge_source_ids': agent.knowledge_source_ids
        }
        
        save_entity('agent', agent_id, agent_data)
        
        response_data = agent_data.copy()
        response_data['id'] = agent_id
        return AgentResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent: AgentUpdate):
    try:
        # Get existing agent
        rows = load_entities('agent')
        existing_data = None
        for row in rows:
            if row[0] == agent_id:
                existing_data = row[1].copy()
                break
        
        if not existing_data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Update only provided fields
        update_data = agent.dict(exclude_unset=True)
        existing_data.update(update_data)
        
        save_entity('agent', agent_id, existing_data)
        
        response_data = existing_data.copy()
        response_data['id'] = agent_id
        return AgentResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    try:
        # Check if agent exists
        rows = load_entities('agent')
        agent_exists = any(row[0] == agent_id for row in rows)
        
        if not agent_exists:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        delete_entity('agent', agent_id)
        return {"message": "Agent deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
