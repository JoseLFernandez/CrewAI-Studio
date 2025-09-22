# How Flows Work in CrewAI Studio

## Overview
Flows are visual workflow representations that allow you to connect different components (agents, tasks, tools) into executable workflows. Think of them like flowcharts that can actually run and execute your AI workflows.

## Architecture Components

### 1. Backend API (`backend/flows.py`)
```
GET    /flows/{flow_id}        - Get a specific flow
POST   /flows                  - Create a new flow  
DELETE /flows/{flow_id}        - Delete a flow
GET    /flows/{flow_id}/runs   - Get execution runs for a flow
POST   /flows/{flow_id}/run    - Execute a flow
```

### 2. Database Layer (`app/db_utils.py`)
- `save_flow(flow_id, data)` - Store flow in database
- `load_flow(flow_id)` - Load specific flow
- `load_flows()` - Load all flows
- `delete_flow(flow_id)` - Remove flow

### 3. Frontend Interfaces

#### Streamlit Frontend (`app/pg_flows.py`)
- Basic flow management (CRUD operations)
- Text/JSON editing of flow structure
- Simple visualization of nodes and edges

#### React Frontend (`frontend/components/FlowEditor.tsx`)
- Visual drag-and-drop flow builder
- Real-time editing with ReactFlow library
- Interactive canvas for building workflows

## Flow Structure

### Nodes
Represent workflow components:
```json
{
  "id": "unique_node_id",
  "type": "agent|task|tool",
  "position": {"x": 100, "y": 200},
  "data": {
    "label": "Human readable name",
    "role": "researcher",
    "description": "What this component does"
  }
}
```

### Edges
Define connections between nodes:
```json
{
  "id": "unique_edge_id", 
  "source": "source_node_id",
  "target": "target_node_id",
  "type": "default|conditional"
}
```

## Example Flow: Research Pipeline

```
Research Agent → Write Task → Review Agent → Final Output
     ↓              ↓             ↓
  "Find data"   "Write report"  "Review quality"
```

This represents:
1. **Research Agent** gathers information
2. **Write Task** creates a report from research
3. **Review Agent** checks and improves the report

## How to Use Flows

### 1. In Streamlit Interface
1. Navigate to "Flows" in sidebar
2. Click "Create Flow" 
3. Edit flow name and structure
4. Add nodes and edges via JSON editor
5. Save the flow

### 2. In React Interface  
1. Open FlowEditor component
2. Drag components from sidebar to canvas
3. Connect nodes by dragging between connection points
4. Configure each node's properties
5. Save and execute flow

### 3. Via API
```bash
# Create a flow
curl -X POST http://localhost:8000/flows \
  -H "Content-Type: application/json" \
  -d '{"nodes": [...], "edges": [...]}'

# Execute a flow
curl -X POST http://localhost:8000/flows/{flow_id}/run
```

## Flow Execution

When a flow runs:
1. **Parse Structure**: System reads nodes and edges
2. **Determine Order**: Calculates execution sequence based on connections
3. **Initialize Components**: Creates actual agent/task instances
4. **Execute Pipeline**: Runs components in order, passing data between them
5. **Collect Results**: Gathers outputs and stores execution logs

## Data Flow Between Components

```
Agent Output → Task Input → Task Output → Next Agent Input
```

Each edge represents data flowing from one component to another, allowing complex workflows where:
- Agents can pass research to tasks
- Tasks can hand results to other agents
- Multiple agents can collaborate on complex problems

## Current Implementation Status

✅ **Working:**
- Flow storage and retrieval
- Basic Streamlit interface
- React visual editor (FlowEditor.tsx)
- Backend API endpoints

🚧 **In Development:**
- Flow execution engine
- Runtime monitoring
- Error handling during execution
- Advanced flow features (conditionals, loops)

## Use Cases

1. **Research Pipelines**: Research → Analyze → Write → Review
2. **Content Creation**: Plan → Write → Edit → Publish  
3. **Data Processing**: Extract → Transform → Validate → Load
4. **Decision Making**: Gather → Analyze → Decide → Act

Flows provide a visual way to orchestrate complex AI workflows without writing code!
