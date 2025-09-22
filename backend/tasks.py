from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app'))
from db_utils import load_entities, save_entity, delete_entity

router = APIRouter()

class TaskCreate(BaseModel):
    id: Optional[str] = None
    description: str
    expected_output: str
    async_execution: bool = False
    agent_id: Optional[str] = None
    context_from_async_tasks_ids: List[str] = []
    context_from_sync_tasks_ids: List[str] = []

class TaskUpdate(BaseModel):
    description: Optional[str] = None
    expected_output: Optional[str] = None
    async_execution: Optional[bool] = None
    agent_id: Optional[str] = None
    context_from_async_tasks_ids: Optional[List[str]] = None
    context_from_sync_tasks_ids: Optional[List[str]] = None

class TaskResponse(BaseModel):
    id: str
    description: str
    expected_output: str
    async_execution: bool
    agent_id: Optional[str]
    context_from_async_tasks_ids: List[str]
    context_from_sync_tasks_ids: List[str]
    created_at: str

@router.get("/", response_model=List[TaskResponse])
async def get_tasks():
    try:
        # Get raw task data from database without loading agents
        rows = load_entities('task')
        tasks = []
        for row in rows:
            task_data = row[1].copy()
            task_data['id'] = row[0]
            tasks.append(TaskResponse(**task_data))
        return sorted(tasks, key=lambda x: x.created_at)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    try:
        rows = load_entities('task')
        for row in rows:
            if row[0] == task_id:
                task_data = row[1].copy()
                task_data['id'] = row[0]
                return TaskResponse(**task_data)
        raise HTTPException(status_code=404, detail="Task not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=TaskResponse)
async def create_task(task: TaskCreate):
    try:
        import uuid
        from datetime import datetime
        
        task_id = task.id or str(uuid.uuid4())
        
        task_data = {
            'description': task.description,
            'expected_output': task.expected_output,
            'async_execution': task.async_execution,
            'agent_id': task.agent_id,
            'context_from_async_tasks_ids': task.context_from_async_tasks_ids,
            'context_from_sync_tasks_ids': task.context_from_sync_tasks_ids,
            'created_at': datetime.now().isoformat()
        }
        
        save_entity('task', task_id, task_data)
        
        response_data = task_data.copy()
        response_data['id'] = task_id
        return TaskResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskUpdate):
    try:
        # Get existing task
        rows = load_entities('task')
        existing_data = None
        for row in rows:
            if row[0] == task_id:
                existing_data = row[1].copy()
                break
        
        if not existing_data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Update only provided fields
        update_data = task.dict(exclude_unset=True)
        existing_data.update(update_data)
        
        save_entity('task', task_id, existing_data)
        
        response_data = existing_data.copy()
        response_data['id'] = task_id
        return TaskResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str):
    try:
        # Check if task exists
        rows = load_entities('task')
        task_exists = any(row[0] == task_id for row in rows)
        
        if not task_exists:
            raise HTTPException(status_code=404, detail="Task not found")
        
        delete_entity('task', task_id)
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
