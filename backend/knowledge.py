from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import sys

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

router = APIRouter()


class KnowledgeSourceCreate(BaseModel):
    name: str
    description: str
    source_type: str
    content: str
    metadata: Dict[str, Any] = {}


class KnowledgeSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeSourceResponse(BaseModel):
    id: str
    name: str
    description: str
    source_type: str
    content: str
    metadata: Dict[str, Any]
    created_at: str


@router.get("/", response_model=List[KnowledgeSourceResponse])
async def list_knowledge_sources():
    try:
        rows = db_utils.load_entities('knowledge_source')
        items: List[KnowledgeSourceResponse] = []
        for row in rows:
            data = row[1]
            items.append(
                KnowledgeSourceResponse(
                    id=row[0],
                    name=data.get('name', 'Unnamed Source'),
                    description=data.get('description', ''),
                    source_type=data.get('source_type', 'string'),
                    content=data.get('content', ''),
                    metadata=data.get('metadata', {}),
                    created_at=data.get('created_at', ''),
                )
            )
        return sorted(items, key=lambda x: x.created_at, reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=KnowledgeSourceResponse)
async def create_knowledge_source(knowledge: KnowledgeSourceCreate):
    try:
        from datetime import datetime
        from utils import rnd_id
        
        ks_id = "KS_" + rnd_id()
        created_at = datetime.now().isoformat()
        
        data = {
            'name': knowledge.name,
            'description': knowledge.description,
            'source_type': knowledge.source_type,
            'content': knowledge.content,
            'metadata': knowledge.metadata,
            'created_at': created_at
        }
        
        db_utils.save_entity('knowledge_source', ks_id, data)
        
        return KnowledgeSourceResponse(
            id=ks_id,
            name=knowledge.name,
            description=knowledge.description,
            source_type=knowledge.source_type,
            content=knowledge.content,
            metadata=knowledge.metadata,
            created_at=created_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create knowledge source: {str(e)}")


@router.get("/{ks_id}", response_model=KnowledgeSourceResponse)
async def get_knowledge_source(ks_id: str):
    try:
        rows = db_utils.load_entities('knowledge_source')
        for row in rows:
            if row[0] == ks_id:
                data = row[1]
                return KnowledgeSourceResponse(
                    id=row[0],
                    name=data.get('name', 'Unnamed Source'),
                    description=data.get('description', ''),
                    source_type=data.get('source_type', 'string'),
                    content=data.get('content', ''),
                    metadata=data.get('metadata', {}),
                    created_at=data.get('created_at', ''),
                )
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{ks_id}", response_model=KnowledgeSourceResponse)
async def update_knowledge_source(ks_id: str, knowledge: KnowledgeSourceUpdate):
    try:
        rows = db_utils.load_entities('knowledge_source')
        
        # Find existing knowledge source
        existing_data = None
        for row in rows:
            if row[0] == ks_id:
                existing_data = row[1]
                break
        
        if existing_data is None:
            raise HTTPException(status_code=404, detail="Knowledge source not found")
        
        # Update fields
        updated_data = existing_data.copy()
        
        if knowledge.name is not None:
            updated_data['name'] = knowledge.name
        if knowledge.description is not None:
            updated_data['description'] = knowledge.description
        if knowledge.source_type is not None:
            updated_data['source_type'] = knowledge.source_type
        if knowledge.content is not None:
            updated_data['content'] = knowledge.content
        if knowledge.metadata is not None:
            updated_data['metadata'] = knowledge.metadata
        
        db_utils.save_entity('knowledge_source', ks_id, updated_data)
        
        return KnowledgeSourceResponse(
            id=ks_id,
            name=updated_data['name'],
            description=updated_data['description'],
            source_type=updated_data['source_type'],
            content=updated_data['content'],
            metadata=updated_data['metadata'],
            created_at=updated_data['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update knowledge source: {str(e)}")


@router.delete("/{ks_id}")
async def delete_knowledge_source(ks_id: str):
    try:
        # Check if knowledge source exists
        rows = db_utils.load_entities('knowledge_source')
        ks_exists = any(row[0] == ks_id for row in rows)
        
        if not ks_exists:
            raise HTTPException(status_code=404, detail="Knowledge source not found")
        
        db_utils.delete_entity('knowledge_source', ks_id)
        
        return {"message": "Knowledge source deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete knowledge source: {str(e)}")
