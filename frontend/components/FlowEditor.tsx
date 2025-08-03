import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Node,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from 'react-flow-renderer';

type FlowData = {
  nodes: Node[];
  edges: Edge[];
};

interface NodeType {
  type: string;
  label: string;
  icon: string;
}

interface FlowRun {
  id: string;
  flow_id: string;
  status?: string;
  output?: any;
  started_at?: string;
  finished_at?: string;
}

const FlowEditor: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [flow, setFlow] = useState<FlowData>({ nodes: [], edges: [] });
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [flowId, setFlowId] = useState<string>('');
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/nodes')
      .then((res) => res.json())
      .then((data) => setNodeTypes(data));
  }, []);

  useEffect(() => {
    setFlow({ nodes, edges });
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const bounds = wrapperRef.current?.getBoundingClientRect();

      if (!type || !reactFlowInstance || !bounds) return;

      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: `${type}_${+new Date()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const fetchRuns = useCallback(() => {
    if (!flowId) return;
    const url =
      statusFilter === 'all'
        ? `/flows/${flowId}/runs`
        : `/flows/${flowId}/runs?status=${statusFilter}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setRuns(data));
  }, [flowId, statusFilter]);

  const rerun = useCallback(
    (id: string) => {
      fetch(`/flows/${flowId}/run`, { method: 'POST' }).then(() => fetchRuns());
    },
    [flowId, fetchRuns]
  );

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside
        style={{
          padding: 10,
          width: 150,
          borderRight: '1px solid #ddd',
        }}
      >
        {nodeTypes.map((n) => (
          <div
            key={n.type}
            draggable
            onDragStart={(event) =>
              event.dataTransfer.setData('application/reactflow', n.type)
            }
            style={{
              padding: 5,
              marginBottom: 5,
              border: '1px solid #999',
              borderRadius: 4,
              textAlign: 'center',
              cursor: 'grab',
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <span>{n.icon}</span>
            {n.label}
          </div>
        ))}
      </aside>
      <div
        ref={wrapperRef}
        style={{ flexGrow: 1 }}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <aside
        style={{
          padding: 10,
          width: 250,
          borderLeft: '1px solid #ddd',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <input
            value={flowId}
            onChange={(e) => setFlowId(e.target.value)}
            placeholder="Flow ID"
            style={{ width: '60%' }}
          />
          <button onClick={fetchRuns} style={{ marginLeft: 4 }}>
            Load
          </button>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Status: </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {runs.map((r) => (
            <li
              key={r.id}
              style={{
                border: '1px solid #ccc',
                padding: 5,
                marginBottom: 5,
              }}
            >
              <div>{r.status} - {r.started_at}</div>
              <button onClick={() => rerun(r.id)}>Re-run</button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

export default FlowEditor;

