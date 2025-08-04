import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, withAuth } from '../context/AuthContext';
import RunConsole from './RunConsole';
import Tour, { TourHandle } from './Tour';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import type {
  Edge as ReactFlowEdge,
  EdgeChange,
  Node as ReactFlowNode,
  NodeChange,
  Connection,
} from '@xyflow/react';

type FlowData = {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
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
  const tourRef = useRef<TourHandle>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<ReactFlowNode, ReactFlowEdge> | null>(null);
  const [nodes, setNodes] = useState<ReactFlowNode[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [flow, setFlow] = useState<FlowData>({ nodes: [], edges: [] });
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [flowId, setFlowId] = useState<string>('');
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch('/plugins')
      .then((res) => res.json())
      .then((data) => setNodeTypes(data))
      .catch((err) => console.error(err));
  }, [authFetch]);

  useEffect(() => {
    setFlow({ nodes, edges });
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<ReactFlowNode>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<ReactFlowEdge>[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
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

      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: ReactFlowNode = {
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
    authFetch(url)
      .then((res) => res.json())
      .then((data) => setRuns(data))
      .catch((err) => console.error(err));
  }, [flowId, statusFilter, authFetch]);

  const rerun = useCallback(
    (id: string) => {
      authFetch(`/flows/${flowId}/run`, { method: 'POST' })
        .then(() => fetchRuns())
        .catch((err) => console.error(err));
    },
    [flowId, fetchRuns, authFetch]
  );

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <Tour ref={tourRef} />
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <button onClick={() => setHelpOpen((o) => !o)}>Help</button>
        {helpOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              marginTop: 4,
              background: '#fff',
              border: '1px solid #ccc',
              padding: 8,
            }}
          >
            <div
              style={{ cursor: 'pointer', marginBottom: 4 }}
              onClick={() => {
                tourRef.current?.start();
                setHelpOpen(false);
              }}
            >
              Restart Tour
            </div>
            <div>
              <a
                href="https://docs.crewai.studio"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
            </div>
          </div>
        )}
      </div>
      <aside
        id="tour-node-panel"
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
        id="tour-canvas"
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
        id="tour-run-panel"
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
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => rerun(r.id)}>Re-run</button>
                <button onClick={() => setSelectedRunId(r.id)}>Logs</button>
              </div>
            </li>
          ))}
        </ul>
        {selectedRunId && (
          <div style={{ marginTop: 10 }}>
            <h4>Logs for {selectedRunId}</h4>
            <RunConsole runId={selectedRunId} />
          </div>
        )}
      </aside>
    </div>
  );
};

export default withAuth(FlowEditor);

