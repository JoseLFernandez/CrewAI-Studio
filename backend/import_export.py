from fastapi import APIRouter, HTTPException, File, UploadFile, Query
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import json
import sys
from pathlib import Path
from datetime import datetime

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

router = APIRouter()


@router.post("/import")
async def import_data(file: UploadFile = File(...)):
    """Import data from a JSON file."""
    try:
        if not file.filename or not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="File must be a JSON file")
        
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        
        imported_counts = {
            'crews': 0,
            'agents': 0,
            'tasks': 0,
            'tools': 0,
            'knowledge': 0,
            'flows': 0
        }
        
        try:
            # Import crews
            if 'crews' in data:
                for crew_data in data['crews']:
                    crew_id = crew_data.get('id', f"C_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                    entity_data = crew_data.get('data', crew_data)
                    entity_data['created_at'] = entity_data.get('created_at', datetime.now().isoformat())
                    db_utils.save_entity('crew', crew_id, entity_data)
                    imported_counts['crews'] += 1
            
            # Import agents
            if 'agents' in data:
                for agent_data in data['agents']:
                    agent_id = agent_data.get('id', f"A_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                    entity_data = agent_data.get('data', agent_data)
                    entity_data['created_at'] = entity_data.get('created_at', datetime.now().isoformat())
                    db_utils.save_entity('agent', agent_id, entity_data)
                    imported_counts['agents'] += 1
            
            # Import tasks
            if 'tasks' in data:
                for task_data in data['tasks']:
                    task_id = task_data.get('id', f"T_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                    entity_data = task_data.get('data', task_data)
                    entity_data['created_at'] = entity_data.get('created_at', datetime.now().isoformat())
                    db_utils.save_entity('task', task_id, entity_data)
                    imported_counts['tasks'] += 1
            
            # Import tools
            if 'tools' in data:
                for tool_data in data['tools']:
                    tool_id = tool_data.get('id', f"TOOL_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                    entity_data = tool_data.get('data', tool_data)
                    entity_data['created_at'] = entity_data.get('created_at', datetime.now().isoformat())
                    db_utils.save_entity('custom_tool', tool_id, entity_data)
                    imported_counts['tools'] += 1
            
            # Import knowledge sources
            if 'knowledge' in data:
                for knowledge_data in data['knowledge']:
                    ks_id = knowledge_data.get('id', f"KS_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                    entity_data = knowledge_data.get('data', knowledge_data)
                    entity_data['created_at'] = entity_data.get('created_at', datetime.now().isoformat())
                    db_utils.save_entity('knowledge_source', ks_id, entity_data)
                    imported_counts['knowledge'] += 1
            
            # Import flows
            if 'flows' in data:
                for flow_data in data['flows']:
                    flow_id = flow_data.get('id', f"F_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                    entity_data = flow_data.get('data', flow_data)
                    entity_data['created_at'] = entity_data.get('created_at', datetime.now().isoformat())
                    db_utils.save_entity('flow', flow_id, entity_data)
                    imported_counts['flows'] += 1
            
        except Exception as e:
            raise e
        
        return {
            "message": "Import completed successfully",
            "imported": imported_counts,
            "total": sum(imported_counts.values())
        }
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/export")
def export_data(type: str = Query("all", description="Type of data to export: all, crews, agents, tasks, tools, knowledge, flows")):
    """Export data as JSON."""
    try:
        export_data = {}
        
        if type in ['all', 'crews']:
            crews = db_utils.load_entities('crew')
            export_data['crews'] = [{'id': row[0], 'data': row[1]} for row in crews]
        
        if type in ['all', 'agents']:
            agents = db_utils.load_entities('agent')
            export_data['agents'] = [{'id': row[0], 'data': row[1]} for row in agents]
        
        if type in ['all', 'tasks']:
            tasks = db_utils.load_entities('task')
            export_data['tasks'] = [{'id': row[0], 'data': row[1]} for row in tasks]
        
        if type in ['all', 'tools']:
            tools = db_utils.load_entities('custom_tool')
            export_data['tools'] = [{'id': row[0], 'data': row[1]} for row in tools]
        
        if type in ['all', 'knowledge']:
            knowledge = db_utils.load_entities('knowledge_source')
            export_data['knowledge'] = [{'id': row[0], 'data': row[1]} for row in knowledge]
        
        if type in ['all', 'flows']:
            flows = db_utils.load_entities('flow')
            export_data['flows'] = [{'id': row[0], 'data': row[1]} for row in flows]
        
        # Add export metadata
        export_data['_export_info'] = {
            'timestamp': datetime.now().isoformat(),
            'type': type,
            'version': '1.0'
        }
        
        # Create filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"crewai_studio_export_{type}_{timestamp}.json"
        
        return JSONResponse(
            content=export_data,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/export/stats")
def get_export_stats():
    """Get statistics for export preview."""
    try:
        stats = {}
        
        # Count each entity type
        entity_types = {
            'crews': 'crew',
            'agents': 'agent', 
            'tasks': 'task',
            'tools': 'custom_tool',
            'knowledge': 'knowledge_source',
            'flows': 'flow'
        }
        
        for key, entity_type in entity_types.items():
            try:
                entities = db_utils.load_entities(entity_type)
                stats[key] = len(entities)
            except Exception:
                stats[key] = 0
        
        stats['total'] = sum(stats.values())
        
        return stats
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")