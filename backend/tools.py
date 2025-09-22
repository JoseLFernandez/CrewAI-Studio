from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import sys
from pathlib import Path

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

router = APIRouter()


class ToolCreate(BaseModel):
    name: str
    description: str
    tool_type: str
    parameters: Dict[str, Any] = {}


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tool_type: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class Tool(BaseModel):
    id: str
    name: str
    description: str
    tool_type: str
    parameters: Dict[str, Any]
    created_at: str


@router.get("/", response_model=List[Tool])
def list_tools():
    """Get all tools."""
    try:
        rows = db_utils.load_entities('custom_tool')
        tools = []
        for row in rows:
            data = row[1]
            tools.append(Tool(
                id=row[0],
                name=data.get('name', 'Unnamed Tool'),
                description=data.get('description', ''),
                tool_type=data.get('tool_type', 'custom'),
                parameters=data.get('parameters', {}),
                created_at=data.get('created_at', '')
            ))
        
        return sorted(tools, key=lambda x: x.created_at, reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tools: {str(e)}")


@router.post("/", response_model=Tool)
def create_tool(tool: ToolCreate):
    """Create a new tool."""
    try:
        from datetime import datetime
        from utils import rnd_id
        
        tool_id = "T_" + rnd_id()
        created_at = datetime.now().isoformat()
        
        data = {
            'name': tool.name,
            'description': tool.description,
            'tool_type': tool.tool_type,
            'parameters': tool.parameters,
            'created_at': created_at
        }
        
        db_utils.save_entity('custom_tool', tool_id, data)
        
        return Tool(
            id=tool_id,
            name=tool.name,
            description=tool.description,
            tool_type=tool.tool_type,
            parameters=tool.parameters,
            created_at=created_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create tool: {str(e)}")


@router.get("/{tool_id}", response_model=Tool)
def get_tool(tool_id: str):
    """Get a specific tool by ID."""
    try:
        rows = db_utils.load_entities('custom_tool')
        
        for row in rows:
            if row[0] == tool_id:
                data = row[1]
                return Tool(
                    id=row[0],
                    name=data.get('name', 'Unnamed Tool'),
                    description=data.get('description', ''),
                    tool_type=data.get('tool_type', 'custom'),
                    parameters=data.get('parameters', {}),
                    created_at=data.get('created_at', '')
                )
        
        raise HTTPException(status_code=404, detail="Tool not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tool: {str(e)}")


@router.put("/{tool_id}", response_model=Tool)
def update_tool(tool_id: str, tool: ToolUpdate):
    """Update a tool."""
    try:
        rows = db_utils.load_entities('custom_tool')
        
        # Find existing tool
        existing_data = None
        for row in rows:
            if row[0] == tool_id:
                existing_data = row[1]
                break
        
        if existing_data is None:
            raise HTTPException(status_code=404, detail="Tool not found")
        
        # Update fields
        updated_data = existing_data.copy()
        
        if tool.name is not None:
            updated_data['name'] = tool.name
        if tool.description is not None:
            updated_data['description'] = tool.description
        if tool.tool_type is not None:
            updated_data['tool_type'] = tool.tool_type
        if tool.parameters is not None:
            updated_data['parameters'] = tool.parameters
        
        db_utils.save_entity('custom_tool', tool_id, updated_data)
        
        return Tool(
            id=tool_id,
            name=updated_data['name'],
            description=updated_data['description'],
            tool_type=updated_data['tool_type'],
            parameters=updated_data['parameters'],
            created_at=updated_data['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update tool: {str(e)}")


@router.delete("/{tool_id}")
def delete_tool(tool_id: str):
    """Delete a tool."""
    try:
        # Check if tool exists
        rows = db_utils.load_entities('custom_tool')
        tool_exists = any(row[0] == tool_id for row in rows)
        
        if not tool_exists:
            raise HTTPException(status_code=404, detail="Tool not found")
        
        db_utils.delete_entity('custom_tool', tool_id)
        
        return {"message": "Tool deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete tool: {str(e)}")