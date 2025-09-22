import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAuth, withAuth } from '../context/AuthContext';
import RunConsole from './RunConsole';
// import Tour, { TourHandle } from './Tour'; // Temporarily disabled due to React version compatibility
import {
  ReactFlow,
  addEdge,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  Handle,
  Position,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import type { Edge as ReactFlowEdge } from '@xyflow/react';
import type {
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

type FlowEditorProps = {
  flowId?: string;
  initialName?: string | null;
  onSaved?: (data: { name?: string | null }) => void;
  onToolsOnlyChange?: (enabled: boolean) => void;
  listOpen?: boolean;
  onToggleList?: () => void;
};

const FlowEditor: React.FC<FlowEditorProps> = ({ flowId, initialName, onSaved, onToolsOnlyChange, listOpen, onToggleList }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // const tourRef = useRef<TourHandle>(null); // Temporarily disabled
  const [helpOpen, setHelpOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<ReactFlowNode, ReactFlowEdge> | null>(null);
  const [nodes, setNodes] = useState<ReactFlowNode[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [flow, setFlow] = useState<FlowData>({ nodes: [], edges: [] });
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [name, setName] = useState<string>(initialName || '');
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(30);
  const autosaveTimer = useRef<any>(null);

  const { authFetch } = useAuth();
  const [agents, setAgents] = useState<Array<{ id: string; role: string }>>([]);
  const [tasksCatalog, setTasksCatalog] = useState<Array<{ id: string; description: string }>>([]);

  // Generic node with source/target handles to allow connections
  const BasicNode: React.FC<any> = ({ data }: any) => (
    <div style={{ padding: 8, border: '1px solid #999', borderRadius: 6, background: '#fff', minWidth: 120 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{data?.label || 'Node'}</div>
      {data?.type && <div style={{ fontSize: 12, color: '#555' }}>{data.type}</div>}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );

  const StartNode: React.FC<any> = ({ data }: any) => (
    <div style={{ padding: 8, border: '1px solid #0d6efd', borderRadius: 12, background: '#e7f1ff', minWidth: 120 }}>
      <div style={{ fontWeight: 700, color: '#0d6efd' }}>{data?.label || 'Start'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );

  const IfNode: React.FC<any> = ({ data }: any) => (
    <div style={{ padding: 8, border: '1px solid #6c757d', borderRadius: 6, background: '#f8f9fa', minWidth: 160 }}>
      <div style={{ fontWeight: 700 }}>IF</div>
      <div style={{ fontSize: 12, color: '#333' }}>{data?.expression || data?.label || 'condition'}</div>
      <Handle type="target" position={Position.Top} />
      <Handle id="true" type="source" position={Position.Bottom} style={{ left: '25%' }} />
      <Handle id="false" type="source" position={Position.Bottom} style={{ left: '75%' }} />
    </div>
  );

  const MergeNode: React.FC<any> = ({ data }: any) => (
    <div style={{ padding: 8, border: '1px solid #198754', borderRadius: 6, background: '#eaf7ef', minWidth: 140 }}>
      <div style={{ fontWeight: 700, color: '#198754' }}>{data?.label || 'Merge'}</div>
      <Handle type="target" position={Position.Top} style={{ left: '25%' }} />
      <Handle type="target" position={Position.Top} style={{ left: '75%' }} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );

  const nodeTypesMap = {
  tool: BasicNode,
  agent: BasicNode,
  task: BasicNode,
  start: StartNode,
  if: IfNode,
  merge: MergeNode,
  set: BasicNode,
  http_request: BasicNode,
  code: BasicNode,
  delay: BasicNode,
  } as const;

  useEffect(() => {
    const loadTypes = async () => {
      try {
        let res = await authFetch('/plugins');
        if (!res.ok) {
          res = await authFetch('/nodes');
        }
        const data = await res.json();
        setNodeTypes(data);
      } catch (err) {
        console.error('Failed to load node types', err);
        setNodeTypes([
          { type: 'tool', label: 'Tool', icon: '🛠️' },
          { type: 'agent', label: 'Agent', icon: '🤖' },
          { type: 'task', label: 'Task', icon: '📌' },
        ]);
      }
    };
    const loadCatalogs = async () => {
      try {
        const [ar, tr] = await Promise.all([
          authFetch('/agents'),
          authFetch('/tasks'),
        ]);
        if (ar.ok) {
          const a = await ar.json();
          setAgents(a.map((x: any) => ({ id: x.id, role: x.role })));
        }
        if (tr.ok) {
          const t = await tr.json();
          setTasksCatalog(t.map((x: any) => ({ id: x.id, description: x.description })));
        }
      } catch (e) {
        console.warn('Failed to load agents/tasks catalogs');
      }
    };
    loadTypes();
    loadCatalogs();
  }, [authFetch]);

  useEffect(() => {
    setFlow({ nodes, edges });
  }, [nodes, edges]);

  // Load flow when flowId changes
  useEffect(() => {
    if (!flowId) return;
    authFetch(`/flows/${flowId}`)
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.nodes || []);
        const loadedEdges = (data.edges || []).map((e: any) => {
          const label = e?.data?.condition ? e.data.condition : e.label;
          return label ? { ...e, label } : e;
        });
        setEdges(loadedEdges);
        setName(data.name || '');
      })
      .catch((e) => console.error('Failed to load flow', e));
  }, [flowId, authFetch]);

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
  data: { label: `${type} node`, type },
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

  const runNow = useCallback(() => {
    if (!flowId) return;
    authFetch(`/flows/${flowId}/run`, { method: 'POST' })
      .then(() => fetchRuns())
      .catch((err) => console.error(err));
  }, [flowId, fetchRuns, authFetch]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const onNodeClick = useCallback((_e: any, node: ReactFlowNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_e: any, edge: ReactFlowEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const updateSelectedNodeData = (updates: Record<string, any>) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...(n.data || {}), ...updates } } : n
      )
    );
  };

  const updateSelectedEdgeData = (updates: Record<string, any>) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selectedEdgeId) return e;
        const next = { ...e, data: { ...(e.data || {}), ...updates } } as ReactFlowEdge;
        // show condition as label
        const cond = (next.data as any)?.condition;
        if (typeof cond === 'string' && cond.trim()) {
          (next as any).label = cond;
        } else if ((next as any).label && !cond) {
          // keep label if already set manually
        }
        return next;
      })
    );
  };

  const deleteSelected = () => {
    if (selectedNodeId) {
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };

  const saveFlow = async () => {
    if (!flowId) return;
    try {
      const res = await authFetch(`/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, nodes, edges })
      });
      if (res.ok) {
        const data = await res.json();
        onSaved?.({ name: data.name });
      }
      alert('Flow saved');
    } catch (e) {
      console.error(e);
      alert('Failed to save flow');
    }
  };

  // Debounced autosave when nodes/edges/name change
  useEffect(() => {
    if (!flowId || !autosave) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveFlow();
    }, 1000);
    return () => clearTimeout(autosaveTimer.current);
  }, [nodes, edges, name, autosave, flowId]);

  // Sidebar visibility for better canvas space
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  // Tools-only mode: only show the left tools palette; hide inspector
  const [toolsOnly, setToolsOnly] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState<number>(420);
  const [resizing, setResizing] = useState<boolean>(false);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      // Calculate desired width from right pane by looking at wrapper width and pointer position
      const container = wrapperRef.current?.parentElement; // grid cell for canvas
      const grid = container?.parentElement; // grid container
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const totalWidth = rect.width;
      const leftPaneWidth = (document.getElementById('tour-node-panel')?.offsetParent ? 220 : 0); // approx when open
      const pointerX = e.clientX - rect.left;
      // inspector width = remaining from pointer to right edge
      let next = Math.round(totalWidth - pointerX - 12 /*gap*/);
      next = Math.max(280, Math.min(700, next));
      setInspectorWidth(next);
    };
    const onUp = () => setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  useEffect(() => {
    if (toolsOnly) {
      setLeftOpen(true);
      setRightOpen(false);
    } else {
      // Re-open inspector when exiting tools-only for convenience
      setRightOpen(true);
    }
  }, [toolsOnly]);

  // Guard: if tools-only is enabled, keep the palette open
  useEffect(() => {
    if (toolsOnly && !leftOpen) setLeftOpen(true);
  }, [toolsOnly, leftOpen]);

  // Notify parent about tools-only mode changes (e.g., to hide flows list)
  useEffect(() => {
    try { onToolsOnlyChange?.(toolsOnly); } catch {}
  }, [toolsOnly, onToolsOnlyChange]);

  return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* <Tour ref={tourRef} /> */} {/* Temporarily disabled */}
      {/* Top toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
        <label htmlFor="flowName" style={{ position: 'absolute', left: -9999 }}>Flow name</label>
        <input
          id="flowName"
          name="flowName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Flow name"
          style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button onClick={saveFlow}>Save</button>
        <button onClick={runNow} disabled={!flowId}>Run</button>
        <button onClick={deleteSelected} disabled={!selectedNodeId && !selectedEdgeId}>Delete</button>
        <button onClick={() => reactFlowInstance?.fitView()}>Reset view</button>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          <button onClick={() => setLeftOpen((v) => !v)} disabled={toolsOnly} aria-label="Toggle palette visibility">{leftOpen ? 'Hide' : 'Show'} palette</button>
          <button onClick={() => setRightOpen((v) => !v)} disabled={toolsOnly} aria-label="Toggle inspector visibility">{rightOpen ? 'Hide' : 'Show'} inspector</button>
          <button onClick={() => setToolsOnly((v) => !v)} aria-pressed={toolsOnly} aria-label="Toggle tools-only mode">{toolsOnly ? 'Exit tools-only' : 'Tools-only mode'}</button>
          <button onClick={onToggleList} disabled={!onToggleList} aria-pressed={!!listOpen} aria-label="Toggle flows list">{listOpen ? 'Hide list' : 'Show list'}</button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <label htmlFor="inspectorSize" style={{ fontSize: 12 }}>Inspector</label>
          <select
            id="inspectorSize"
            aria-label="Inspector size"
            value={inspectorWidth}
            onChange={(e) => setInspectorWidth(parseInt(e.target.value) || 420)}
          >
            <option value={320}>Small</option>
            <option value={420}>Medium</option>
            <option value={520}>Large</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => setHelpOpen((o) => !o)}>Help</button>
        </div>
      </div>

      {/* 3-column layout: left palette | canvas | right inspector */}
  <div style={{
        display: 'grid',
        gridTemplateColumns: `${leftOpen ? '220px' : '0px'} ${rightOpen ? '6px' : '0px'} minmax(500px, 1fr) ${rightOpen ? '6px' : '0px'} ${rightOpen ? inspectorWidth + 'px' : '0px'}`,
        gridTemplateRows: '1fr',
        gap: 12,
        padding: '0 8px',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        alignItems: 'stretch'
      }}>
        <aside
          id="tour-node-panel"
          style={{
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 6,
            background: '#fff',
            height: '100%',
            overflowY: 'auto',
            display: leftOpen ? 'block' : 'none'
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

  {/* Left gutter between palette and canvas when inspector is open */}
  <div />

  {/* Canvas center column */}
        <div
          id="tour-canvas"
          ref={wrapperRef}
          style={{ height: '100%', minHeight: 600, width: '100%', background: '#f3f6fb', border: '1px solid #eef2f7', borderRadius: 6 }}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            style={{ width: '100%', height: '100%' }}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypesMap}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDoubleClick={(_, node) => {
              if (node.type === 'start') runNow();
            }}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            snapToGrid={snapToGrid}
            snapGrid={[gridSize, gridSize]}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={gridSize} size={1} color="#cbd5e1" />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        {rightOpen ? (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={() => setResizing(true)}
            style={{ width: 6, cursor: 'col-resize', height: '100%', userSelect: 'none' }}
            title="Drag to resize inspector"
          />
        ) : (
          <div />
        )}

    <aside
          id="tour-inspector-and-run"
          style={{
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 6,
            overflowY: 'auto',
            background: '#fff',
      height: '100%',
      minWidth: 0
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Inspector</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <label htmlFor="autosave" style={{ fontSize: 12 }}>
                <input id="autosave" name="autosave" type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} /> Autosave
              </label>
              <label htmlFor="snapToggle" style={{ fontSize: 12 }}>
                <input id="snapToggle" name="snap" type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} /> Snap
              </label>
              <label htmlFor="gridSize" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                Grid
                <input
                  id="gridSize"
                  name="gridSize"
                  type="number"
                  min={5}
                  max={80}
                  step={5}
                  value={gridSize}
                  onChange={(e) => setGridSize(Math.min(80, Math.max(5, parseInt(e.target.value) || 30)))}
                  style={{ width: 64 }}
                />
              </label>
            </div>
          </div>
          {selectedNodeId && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Node: {selectedNodeId}</div>
              <div style={{ marginBottom: 6 }}>
                <label htmlFor={`nodeLabel-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Label</label>
                <input
                  id={`nodeLabel-${selectedNodeId}`}
                  name="nodeLabel"
                  value={(nodes.find((n) => n.id === selectedNodeId)?.data?.label as string) || ''}
                  onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              {/* Quick editors for known node types */}
              {(() => {
                const node = nodes.find((n) => n.id === selectedNodeId);
                if (!node) return null;
                if (node.type === 'agent') {
                  return (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div>
                        <label htmlFor={`agentRole-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Role</label>
                        <input
                          id={`agentRole-${selectedNodeId}`}
                          name="agentRole"
                          value={(node.data as any)?.role || ''}
                          onChange={(e) => updateSelectedNodeData({ role: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`agentGoal-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Goal</label>
                        <input
                          id={`agentGoal-${selectedNodeId}`}
                          name="agentGoal"
                          value={(node.data as any)?.goal || ''}
                          onChange={(e) => updateSelectedNodeData({ goal: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`agentBackstory-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Backstory</label>
                        <textarea
                          id={`agentBackstory-${selectedNodeId}`}
                          name="agentBackstory"
                          value={(node.data as any)?.backstory || ''}
                          onChange={(e) => updateSelectedNodeData({ backstory: e.target.value })}
                          style={{ width: '100%', minHeight: 80 }}
                        />
                      </div>
                      <label htmlFor={`agentVerbose-${selectedNodeId}`} style={{ fontSize: 12 }}>
                        <input
                          id={`agentVerbose-${selectedNodeId}`}
                          name="agentVerbose"
                          type="checkbox"
                          checked={!!(node.data as any)?.verbose}
                          onChange={(e) => updateSelectedNodeData({ verbose: e.target.checked })}
                        />{' '}
                        Verbose
                      </label>
                    </div>
                  );
                }
                if (node.type === 'task') {
                  return (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div>
                        <label htmlFor={`taskDescription-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Description</label>
                        <textarea
                          id={`taskDescription-${selectedNodeId}`}
                          name="taskDescription"
                          value={(node.data as any)?.description || ''}
                          onChange={(e) => updateSelectedNodeData({ description: e.target.value })}
                          style={{ width: '100%', minHeight: 80 }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`taskExpected-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Expected Output</label>
                        <textarea
                          id={`taskExpected-${selectedNodeId}`}
                          name="taskExpectedOutput"
                          value={(node.data as any)?.expected_output || ''}
                          onChange={(e) => updateSelectedNodeData({ expected_output: e.target.value })}
                          style={{ width: '100%', minHeight: 60 }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`taskAgent-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Agent</label>
                        <select
                          id={`taskAgent-${selectedNodeId}`}
                          name="taskAgent"
                          value={(node.data as any)?.agent_id || ''}
                          onChange={(e) => updateSelectedNodeData({ agent_id: e.target.value })}
                          style={{ width: '100%' }}
                        >
                          <option value="">— Select existing —</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>{a.role}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button
                            onClick={() => {
                              // create an inline Agent node and link it logically
                              const newId = `agent_${Date.now()}`;
                              const newNode = { id: newId, type: 'agent', position: { x: (node.position as any)?.x || 0, y: ((node.position as any)?.y || 0) - 120 }, data: { label: 'Agent', role: 'Agent', goal: '', backstory: '' } } as any;
                              setNodes((nds) => nds.concat(newNode));
                              updateSelectedNodeData({ agent_id: newId });
                            }}
                          >New agent</button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`taskInputs-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Inputs from tasks</label>
                        <select
                          id={`taskInputs-${selectedNodeId}`}
                          name="taskInputs"
                          multiple
                          value={((node.data as any)?.context_from_sync_tasks_ids || []) as string[]}
                          onChange={(e) => {
                            const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                            updateSelectedNodeData({ context_from_sync_tasks_ids: opts });
                          }}
                          style={{ width: '100%' }}
                        >
                          {tasksCatalog
                            .filter((t) => t.id !== node.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>{t.description?.slice(0, 40) || t.id}</option>
                            ))}
                        </select>
                      </div>
                      <label htmlFor={`taskAsync-${selectedNodeId}`} style={{ fontSize: 12 }}>
                        <input
                          id={`taskAsync-${selectedNodeId}`}
                          name="taskAsyncExecution"
                          type="checkbox"
                          checked={!!(node.data as any)?.async_execution}
                          onChange={(e) => updateSelectedNodeData({ async_execution: e.target.checked })}
                        />{' '}
                        Async Execution
                      </label>
                    </div>
                  );
                }
                if (node.type === 'start') {
                  return (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 12, color: '#555' }}>No configuration for Start node.</div>
                    </div>
                  );
                }
                if (node.type === 'if') {
                  return (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div>
                        <label htmlFor={`ifExpression-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Expression</label>
                        <input
                          id={`ifExpression-${selectedNodeId}`}
                          name="ifExpression"
                          value={(node.data as any)?.expression || ''}
                          onChange={(e) => updateSelectedNodeData({ expression: e.target.value })}
                          placeholder="e.g. result.score > 0.8"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  );
                }
                if (node.type === 'merge') {
                  return (
                    <div style={{ fontSize: 12, color: '#555' }}>No configuration for Merge node.</div>
                  );
                }
                if (node.type === 'set') {
                  return (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label htmlFor={`setFields-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Fields (JSON)</label>
                      <textarea
                        id={`setFields-${selectedNodeId}`}
                        name="setFields"
                        value={JSON.stringify((node.data as any)?.fields || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const val = JSON.parse(e.target.value || '{}');
                            updateSelectedNodeData({ fields: val });
                          } catch {}
                        }}
                        style={{ width: '100%', minHeight: 100 }}
                      />
                    </div>
                  );
                }
                if (node.type === 'http_request') {
                  const data = (node.data as any) || {};
                  return (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div>
                        <label htmlFor={`httpUrl-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>URL</label>
                        <input
                          id={`httpUrl-${selectedNodeId}`}
                          name="httpUrl"
                          value={data.url || ''}
                          onChange={(e) => updateSelectedNodeData({ url: e.target.value })}
                          placeholder="https://api.example.com/path"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`httpMethod-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Method</label>
                        <select
                          id={`httpMethod-${selectedNodeId}`}
                          name="httpMethod"
                          value={data.method || 'GET'}
                          onChange={(e) => updateSelectedNodeData({ method: e.target.value })}
                          style={{ width: '100%' }}
                        >
                          <option>GET</option>
                          <option>POST</option>
                          <option>PUT</option>
                          <option>DELETE</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`httpHeaders-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Headers (JSON)</label>
                        <textarea
                          id={`httpHeaders-${selectedNodeId}`}
                          name="httpHeaders"
                          value={JSON.stringify(data.headers || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const val = JSON.parse(e.target.value || '{}');
                              updateSelectedNodeData({ headers: val });
                            } catch {}
                          }}
                          style={{ width: '100%', minHeight: 80 }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`httpBody-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Body (JSON)</label>
                        <textarea
                          id={`httpBody-${selectedNodeId}`}
                          name="httpBody"
                          value={JSON.stringify(data.body || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const val = JSON.parse(e.target.value || '{}');
                              updateSelectedNodeData({ body: val });
                            } catch {}
                          }}
                          style={{ width: '100%', minHeight: 100 }}
                        />
                      </div>
                    </div>
                  );
                }
                if (node.type === 'code') {
                  return (
                    <div>
                      <label htmlFor={`codeScript-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Script</label>
                      <textarea
                        id={`codeScript-${selectedNodeId}`}
                        name="codeScript"
                        value={(node.data as any)?.script || ''}
                        onChange={(e) => updateSelectedNodeData({ script: e.target.value })}
                        placeholder="// JavaScript code to run"
                        style={{ width: '100%', minHeight: 120, fontFamily: 'monospace' }}
                      />
                    </div>
                  );
                }
                if (node.type === 'delay') {
                  return (
                    <div>
                      <label htmlFor={`delayMs-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Delay (ms)</label>
                      <input
                        id={`delayMs-${selectedNodeId}`}
                        name="delayMs"
                        type="number"
                        min={0}
                        value={(node.data as any)?.ms ?? 0}
                        onChange={(e) => updateSelectedNodeData({ ms: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  );
                }
                return null;
              })()}
              <div>
                <label htmlFor={`nodeDataJson-${selectedNodeId}`} style={{ display: 'block', fontSize: 12 }}>Data (JSON)</label>
                <textarea
                  id={`nodeDataJson-${selectedNodeId}`}
                  name="nodeDataJson"
                  value={JSON.stringify(nodes.find((n) => n.id === selectedNodeId)?.data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const val = JSON.parse(e.target.value || '{}');
                      updateSelectedNodeData(val);
                    } catch {}
                  }}
                  style={{ width: '100%', minHeight: 120 }}
                />
              </div>
            </div>
          )}
          {selectedEdgeId && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Edge: {selectedEdgeId}</div>
              <div>
                <label htmlFor={`edgeCondition-${selectedEdgeId}`} style={{ display: 'block', fontSize: 12 }}>Condition</label>
                <input
                  id={`edgeCondition-${selectedEdgeId}`}
                  name="edgeCondition"
                  value={(edges.find((e) => e.id === selectedEdgeId)?.data?.condition as string) || ''}
                  onChange={(e) => updateSelectedEdgeData({ condition: e.target.value })}
                  placeholder="e.g. result.score > 0.8"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={() => updateSelectedEdgeData({ condition: 'true' })}>Set True</button>
                <button onClick={() => updateSelectedEdgeData({ condition: 'false' })}>Set False</button>
              </div>
            </div>
          )}
          <div style={{ borderTop: '1px solid #eee', margin: '12px 0' }} />
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="statusFilter">Status:</label>
            <select
              id="statusFilter"
              name="status"
              aria-label="Status filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="running">running</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
            <button onClick={runNow} disabled={!flowId}>Run</button>
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
    </div>
  );
};

export default withAuth(FlowEditor);

