import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, withAuth } from '../context/AuthContext';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import { ui } from '../lib/ui';

type Crew = {
  id: string;
  name: string;
  agent_count: number;
  task_count: number;
};

type Agent = {
  id: string;
  role: string;
};

type Task = {
  id: string;
  description: string;
  agent_id?: string | null;
  async_execution: boolean;
};

type CrewDetail = {
  id: string;
  name: string;
  process: string;
  verbose: boolean;
  agent_ids: string[];
  task_ids: string[];
  memory: boolean;
  cache: boolean;
  planning: boolean;
  max_rpm: number;
  manager_llm?: string | null;
  manager_agent_id?: string | null;
  knowledge_source_ids: string[];
};
type KnowledgeSource = { id: string; name: string; source_type: string };


type CrewRunResponse = {
  id: string; // result id
  crew_id: string;
  crew_name: string;
  created_at: string;
};

async function fetchCrews(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>): Promise<Crew[]> {
  const res = await authFetch('/crews');
  if (!res.ok) throw new Error('Failed to fetch crews');
  return res.json();
}

async function createCrew(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  name: string
): Promise<Crew> {
  const res = await authFetch('/crews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create crew');
  return res.json();
}

async function updateCrew(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  id: string,
  data: Partial<CrewDetail>
): Promise<CrewDetail> {
  const res = await authFetch(`/crews/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = 'Failed to update crew';
    try { const d = await res.json(); if (d?.detail) detail = d.detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

async function deleteCrew(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<void> {
  const res = await authFetch(`/crews/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete crew');
}

async function fetchAgents(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>): Promise<Agent[]> {
  const res = await authFetch('/agents');
  if (!res.ok) throw new Error('Failed to fetch agents');
  const data = await res.json();
  return data.map((a: any) => ({ id: a.id, role: a.role }));
}

async function fetchTasks(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>): Promise<Task[]> {
  const res = await authFetch('/tasks');
  if (!res.ok) throw new Error('Failed to fetch tasks');
  const data = await res.json();
  return data.map((t: any) => ({ id: t.id, description: t.description, agent_id: t.agent_id, async_execution: t.async_execution }));
}

async function fetchCrewDetail(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>, id: string): Promise<CrewDetail> {
  const res = await authFetch(`/crews/${id}`);
  if (!res.ok) throw new Error('Failed to fetch crew detail');
  return res.json();
}

async function runCrew(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  id: string,
  inputs: Record<string, string> = {}
): Promise<CrewRunResponse> {
  const res = await authFetch(`/crews/${id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  });
  if (!res.ok) {
    let detail = 'Failed to run crew';
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

function CrewsPage() {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [editName, setEditName] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [editAgentIds, setEditAgentIds] = useState<string[]>([]);
  const [editTaskIds, setEditTaskIds] = useState<string[]>([]);
  const [editProcess, setEditProcess] = useState<'sequential' | 'hierarchical'>('sequential');
  const [editVerbose, setEditVerbose] = useState<boolean>(true);
  const [editMemory, setEditMemory] = useState<boolean>(false);
  const [editCache, setEditCache] = useState<boolean>(true);
  const [editPlanning, setEditPlanning] = useState<boolean>(false);
  const [editMaxRpm, setEditMaxRpm] = useState<number>(1000);
  const [editManagerLLM, setEditManagerLLM] = useState<string>('');
  const [editManagerAgentId, setEditManagerAgentId] = useState<string | null>(null);

  const { data: crews, isLoading, isError, error } = useQuery({
    queryKey: ['crews'],
    queryFn: () => fetchCrews(authFetch),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(authFetch),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(authFetch),
  });
  const { data: knowledgeSources } = useQuery({
    queryKey: ['knowledge'],
    queryFn: async () => {
      const res = await authFetch('/knowledge');
      if (!res.ok) throw new Error('Failed to fetch knowledge sources');
      return res.json() as Promise<KnowledgeSource[]>;
    },
  });
  const [editKnowledgeSourceIds, setEditKnowledgeSourceIds] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (newName: string) => createCrew(authFetch, newName),
    onMutate: async (newName: string) => {
      await queryClient.cancelQueries({ queryKey: ['crews'] });
      const previous = queryClient.getQueryData<Crew[]>(['crews']) || [];
      const optimisticCrew: Crew = { id: Date.now().toString(), name: newName, agent_count: 0, task_count: 0 };
      queryClient.setQueryData<Crew[]>(['crews'], [...previous, optimisticCrew]);
      return { previous };
    },
    onError: (_err, _newName, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['crews'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrewDetail> }) => updateCrew(authFetch, id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['crews'] });
      const previous = queryClient.getQueryData<Crew[]>(['crews']) || [];
      const updated = previous.map(crew => 
        crew.id === id && data?.name ? { ...crew, name: data.name } : crew
      );
      queryClient.setQueryData<Crew[]>(['crews'], updated);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['crews'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCrew(authFetch, id),
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: ['crews'] });
      const previous = queryClient.getQueryData<Crew[]>(['crews']) || [];
      queryClient.setQueryData<Crew[]>(['crews'], previous.filter(crew => crew.id !== deletedId));
      return { previous };
    },
    onError: (_err, _deletedId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['crews'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: ({ id, inputs }: { id: string; inputs?: Record<string, string> }) => runCrew(authFetch, id, inputs || {}),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate(name);
      setName('');
    }
  };

  const handleEdit = (crew: Crew) => {
    setEditingCrew(crew);
    setEditName(crew.name);
    // Fetch crew detail to populate agents/tasks
    fetchCrewDetail(authFetch, crew.id)
      .then((detail) => {
        setEditAgentIds(detail.agent_ids || []);
        setEditTaskIds(detail.task_ids || []);
  setEditProcess((detail.process as 'sequential' | 'hierarchical') || 'sequential');
  setEditVerbose(!!detail.verbose);
  setEditMemory(!!detail.memory);
  setEditCache(!!detail.cache);
  setEditPlanning(!!detail.planning);
  setEditMaxRpm(detail.max_rpm || 1000);
  setEditManagerLLM(detail.manager_llm || '');
  setEditManagerAgentId(detail.manager_agent_id || null);
  setEditKnowledgeSourceIds(detail.knowledge_source_ids || []);
      })
      .catch(() => {
        setEditAgentIds([]);
        setEditTaskIds([]);
  setEditProcess('sequential');
  setEditVerbose(true);
  setEditMemory(false);
  setEditCache(true);
  setEditPlanning(false);
  setEditMaxRpm(1000);
  setEditManagerLLM('');
  setEditManagerAgentId(null);
  setEditKnowledgeSourceIds([]);
      });
  };

  const handleSaveEdit = () => {
    if (editingCrew) {
      const payload: Partial<CrewDetail> = {
        name: editName.trim() || editingCrew.name,
        agent_ids: editAgentIds,
        task_ids: editTaskIds,
        process: editProcess,
        verbose: editVerbose,
        memory: editMemory,
        cache: editCache,
        planning: editPlanning,
        max_rpm: editMaxRpm,
        manager_llm: editProcess === 'hierarchical' ? (editManagerLLM || null) : null,
        manager_agent_id: editProcess === 'hierarchical' ? (editManagerAgentId || null) : null,
        knowledge_source_ids: editKnowledgeSourceIds,
      };
      updateMutation.mutate({ id: editingCrew.id, data: payload });
      setEditingCrew(null);
      setEditName('');
      setEditAgentIds([]);
      setEditTaskIds([]);
      setEditProcess('sequential');
      setEditVerbose(true);
      setEditMemory(false);
      setEditCache(true);
      setEditPlanning(false);
      setEditMaxRpm(1000);
      setEditManagerLLM('');
      setEditManagerAgentId(null);
      setEditKnowledgeSourceIds([]);
    }
  };

  const handleCancelEdit = () => {
    setEditingCrew(null);
    setEditName('');
  };

  const handleDelete = (crew: Crew) => {
    if (confirm(`Are you sure you want to delete "${crew.name}"?`)) {
      deleteMutation.mutate(crew.id);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div style={{color:'#c00'}}>Failed to load crews: {(error as Error)?.message || 'Unknown error'}</div>;

  return (
    <div style={ui.container}>
      <Navigation currentPage="crews" />

      <h1>Crews Management</h1>
      
      {/* Add new crew form */}
      <div style={{ marginBottom: 30, ...ui.card }}>
        <h2>Add New Crew</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label htmlFor="newCrewName" style={{ position: 'absolute', left: -9999 }}>New crew name</label>
          <input
            id="newCrewName"
            name="newCrewName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter crew name"
            style={{ ...ui.input, minWidth: 200 }}
          />
          <button 
            type="submit" 
            disabled={createMutation.isPending}
            style={ui.buttons.primary}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Crew'}
          </button>
        </form>
      </div>

      {/* Crews list */}
      <div>
        <h2>Existing Crews ({crews?.length || 0})</h2>
        {crews?.length === 0 ? (
          <div>
            <p style={{ color: '#666', fontStyle: 'italic' }}>No crews created yet. Add your first crew above!</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['crews'] })}
              style={ui.buttons.neutral}
            >
              Refresh
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {crews?.map((crew) => (
              <div 
                key={crew.id} 
                style={{ ...ui.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ flex: 1 }}>
                  {editingCrew?.id === crew.id ? (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label htmlFor={`editName-${crew.id}`} style={{ position: 'absolute', left: -9999 }}>Edit crew name</label>
                        <input
                          id={`editName-${crew.id}`}
                          name={`editName-${crew.id}`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ ...ui.input, minWidth: 200 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <label htmlFor={`editProcess-${crew.id}`} style={{ fontWeight: 600, marginRight: 8 }}>Process</label>
                          <select
                            id={`editProcess-${crew.id}`}
                            name="process"
                            value={editProcess}
                            onChange={(e) => setEditProcess(e.target.value as 'sequential' | 'hierarchical')}
                            style={{ ...ui.select, width: 'auto' }}
                          >
                            <option value="sequential">sequential</option>
                            <option value="hierarchical">hierarchical</option>
                          </select>
                        </div>
                        <label htmlFor={`editVerbose-${crew.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input id={`editVerbose-${crew.id}`} name="verbose" type="checkbox" checked={editVerbose} onChange={(e) => setEditVerbose(e.target.checked)} />
                          Verbose
                        </label>
                        <label htmlFor={`editMemory-${crew.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input id={`editMemory-${crew.id}`} name="memory" type="checkbox" checked={editMemory} onChange={(e) => setEditMemory(e.target.checked)} />
                          Memory
                        </label>
                        <label htmlFor={`editCache-${crew.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input id={`editCache-${crew.id}`} name="cache" type="checkbox" checked={editCache} onChange={(e) => setEditCache(e.target.checked)} />
                          Cache
                        </label>
                        <label htmlFor={`editPlanning-${crew.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input id={`editPlanning-${crew.id}`} name="planning" type="checkbox" checked={editPlanning} onChange={(e) => setEditPlanning(e.target.checked)} />
                          Planning
                        </label>
                        <div>
                          <label htmlFor={`editMaxRpm-${crew.id}`} style={{ fontWeight: 600, marginRight: 8 }}>Max req/min</label>
                          <input
                            id={`editMaxRpm-${crew.id}`}
                            name="maxRequestsPerMinute"
                            type="number"
                            value={editMaxRpm}
                            min={1}
                            onChange={(e) => setEditMaxRpm(parseInt(e.target.value) || 1)}
                            style={{ ...ui.input, width: 120 }}
                          />
                        </div>
                      </div>
                      {editProcess === 'hierarchical' && (
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>Manager LLM (id)</div>
                            <input
                              id={`managerLLM-${crew.id}`}
                              name="managerLLM"
                              value={editManagerLLM}
                              onChange={(e) => setEditManagerLLM(e.target.value)}
                              placeholder="Provider: model (e.g., OpenAI: gpt-4o-mini)"
                              style={{ ...ui.input, minWidth: 320 }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>Manager Agent</div>
                            <select
                              id={`managerAgent-${crew.id}`}
                              name="managerAgentId"
                              value={editManagerAgentId || ''}
                              onChange={(e) => setEditManagerAgentId(e.target.value || null)}
                              style={{ ...ui.select, minWidth: 220 }}
                            >
                              <option value="">None</option>
                              {agents?.map(a => (
                                <option key={a.id} value={a.id}>{a.role}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Agents</div>
                          <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #e5e7eb', padding: 8, borderRadius: 6, minWidth: 220, background: 'white' }}>
                            {agents?.map(a => (
                              <label key={a.id} htmlFor={`crewAgent-${crew.id}-${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <input
                                  id={`crewAgent-${crew.id}-${a.id}`}
                                  name="agentIds"
                                  type="checkbox"
                                  checked={editAgentIds.includes(a.id)}
                                  onChange={(e) => {
                                    setEditAgentIds(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id));
                                  }}
                                />
                                <span>{a.role}</span>
                              </label>
                            ))}
                            {agents && agents.length === 0 && (
                              <div style={{ color: '#666' }}>No agents yet. Create them in the app or via API.</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Tasks</div>
                          <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #e5e7eb', padding: 8, borderRadius: 6, minWidth: 320, background: 'white' }}>
                            {tasks?.map(t => (
                              <label key={t.id} htmlFor={`crewTask-${crew.id}-${t.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <input
                                  id={`crewTask-${crew.id}-${t.id}`}
                                  name="taskIds"
                                  type="checkbox"
                                  checked={editTaskIds.includes(t.id)}
                                  onChange={(e) => {
                                    setEditTaskIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id));
                                  }}
                                />
                                <span>{t.description}</span>
                              </label>
                            ))}
                            {tasks && tasks.length === 0 && (
                              <div style={{ color: '#666' }}>No tasks yet. Create them in the app or via API.</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Knowledge Sources</div>
                          <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #e5e7eb', padding: 8, borderRadius: 6, minWidth: 280, background: 'white' }}>
                            {knowledgeSources?.map(ks => (
                              <label key={ks.id} htmlFor={`crewKS-${crew.id}-${ks.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <input
                                  id={`crewKS-${crew.id}-${ks.id}`}
                                  name="knowledgeSourceIds"
                                  type="checkbox"
                                  checked={editKnowledgeSourceIds.includes(ks.id)}
                                  onChange={(e) => {
                                    setEditKnowledgeSourceIds(prev => e.target.checked ? [...prev, ks.id] : prev.filter(x => x !== ks.id));
                                  }}
                                />
                                <span>{ks.name} <span style={{ color: '#666' }}>({ks.source_type})</span></span>
                              </label>
                            ))}
                            {knowledgeSources && knowledgeSources.length === 0 && (
                              <div style={{ color: '#666' }}>No knowledge sources yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                        style={ui.buttons.success}
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        style={ui.buttons.muted}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ margin: '0 0 5px 0' }}>{crew.name}</h3>
                      <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>ID: {crew.id}</p>
                      <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.9em' }}>
                        Agents: {crew.agent_count} · Tasks: {crew.task_count}
                      </p>
                    </div>
                  )}
                </div>
                
                {editingCrew?.id !== crew.id && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link 
                      href={`/results`}
                      style={{ ...ui.buttons.primary, backgroundColor: '#6f42c1' }}
                    >
                      Results
                    </Link>
                    <button 
                      onClick={async () => {
                        setRunningId(crew.id);
                        try {
                          const r = await runMutation.mutateAsync({ id: crew.id });
                          window.location.href = `/results/${r.id}`;
                        } catch (e: any) {
                          alert(e?.message || 'Failed to run crew');
                        } finally {
                          setRunningId(null);
                        }
                      }}
                      disabled={runMutation.isPending || runningId === crew.id || crew.agent_count === 0 || crew.task_count === 0}
                      style={{ ...ui.buttons.success, backgroundColor: '#198754' }}
                    >
                      {crew.agent_count === 0 || crew.task_count === 0 ? 'Configure first' : (runMutation.isPending && runningId === crew.id ? 'Running...' : 'Run')}
                    </button>
                    <button 
                      onClick={() => handleEdit(crew)}
                      style={ui.buttons.info}
                    >
                      Edit
                    </button>
                    <Link 
                      href="/agents"
                      style={ui.buttons.primary}
                    >
                      Agents
                    </Link>
                    <Link 
                      href="/tasks"
                      style={ui.buttons.primary}
                    >
                      Tasks
                    </Link>
                    <button 
                      onClick={() => handleDelete(crew)}
                      disabled={deleteMutation.isPending}
                      style={ui.buttons.danger}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(CrewsPage);
