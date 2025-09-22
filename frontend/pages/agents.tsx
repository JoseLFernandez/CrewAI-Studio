import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { ui } from '../lib/ui';

interface Agent {
  id: string;
  role: string;
  backstory: string;
  goal: string;
  allow_delegation: boolean;
  verbose: boolean;
  cache: boolean;
  llm_provider_model: string;
  temperature: number;
  max_iter: number;
  tool_ids: string[];
  knowledge_source_ids: string[];
  created_at: string;
}

interface AgentFormData {
  role: string;
  backstory: string;
  goal: string;
  allow_delegation: boolean;
  verbose: boolean;
  cache: boolean;
  llm_provider_model: string;
  temperature: number;
  max_iter: number;
  tool_ids: string[];
  knowledge_source_ids: string[];
}

const AgentsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    role: '',
    backstory: '',
    goal: '',
    allow_delegation: false,
    verbose: false,
    cache: true,
    llm_provider_model: 'gpt-4o-mini',
    temperature: 0.7,
    max_iter: 15,
    tool_ids: [],
    knowledge_source_ids: []
  });

  const { data: agents = [], isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await authFetch('/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newAgent: AgentFormData) => {
      const response = await authFetch('/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAgent),
      });
      if (!response.ok) {
        throw new Error('Failed to create agent');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowCreateForm(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Agent) => {
      const response = await authFetch(`/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        throw new Error('Failed to update agent');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setEditingAgent(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authFetch(`/agents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  const resetForm = () => {
    setFormData({
      role: '',
      backstory: '',
      goal: '',
      allow_delegation: false,
      verbose: false,
      cache: true,
      llm_provider_model: 'gpt-4o-mini',
      temperature: 0.7,
      max_iter: 15,
      tool_ids: [],
      knowledge_source_ids: []
    });
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      role: agent.role,
      backstory: agent.backstory,
      goal: agent.goal,
      allow_delegation: agent.allow_delegation,
      verbose: agent.verbose,
      cache: agent.cache,
      llm_provider_model: agent.llm_provider_model,
      temperature: agent.temperature,
      max_iter: agent.max_iter,
      tool_ids: agent.tool_ids,
      knowledge_source_ids: agent.knowledge_source_ids
    });
    setShowCreateForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgent) {
      updateMutation.mutate({ ...editingAgent, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingAgent(null);
    resetForm();
  };

  const handleDelete = (agent: Agent) => {
    if (confirm(`Are you sure you want to delete agent "${agent.role}"?`)) {
      deleteMutation.mutate(agent.id);
    }
  };

  if (isLoading) return <div style={ui.container}><Navigation currentPage="agents" /><div>Loading agents...</div></div>;
  if (error) return <div style={ui.container}><Navigation currentPage="agents" /><div style={{ color: 'red' }}>Error: {error.message}</div></div>;

  return (
    <div style={ui.container}>
      <Navigation currentPage="agents" />

      <h1>Agents Management</h1>
      
      {/* Add new agent form */}
      <div style={{ marginBottom: 30, ...ui.card }}>
        <h2>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
        {!showCreateForm ? (
          <button 
            onClick={() => setShowCreateForm(true)}
            style={ui.buttons.primary}
          >
            Add Agent
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label htmlFor="agentRole" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Role *</label>
                <input
                  id="agentRole"
                  name="role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={ui.input}
                  required
                />
              </div>
              <div>
                <label htmlFor="agentModel" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>LLM Model</label>
                <select
                  id="agentModel"
                  name="llm_provider_model"
                  aria-label="LLM model"
                  value={formData.llm_provider_model}
                  onChange={(e) => setFormData({ ...formData, llm_provider_model: e.target.value })}
                  style={ui.select}
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="agentGoal" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Goal *</label>
              <textarea
                id="agentGoal"
                name="goal"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                style={ui.textarea}
                required
              />
            </div>

            <div>
              <label htmlFor="agentBackstory" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Backstory *</label>
              <textarea
                id="agentBackstory"
                name="backstory"
                value={formData.backstory}
                onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                style={ui.textarea}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label htmlFor="agentTemperature" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Temperature</label>
                <input
                  id="agentTemperature"
                  name="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  style={ui.input}
                />
              </div>
              <div>
                <label htmlFor="agentMaxIter" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max Iterations</label>
                <input
                  id="agentMaxIter"
                  name="max_iter"
                  type="number"
                  min="1"
                  value={formData.max_iter}
                  onChange={(e) => setFormData({ ...formData, max_iter: parseInt(e.target.value) })}
                  style={ui.input}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={formData.allow_delegation}
                  onChange={(e) => setFormData({ ...formData, allow_delegation: e.target.checked })}
                />
                Allow Delegation
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={formData.verbose}
                  onChange={(e) => setFormData({ ...formData, verbose: e.target.checked })}
                />
                Verbose
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={formData.cache}
                  onChange={(e) => setFormData({ ...formData, cache: e.target.checked })}
                />
                Cache
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={ui.buttons.success}
              >
                {editingAgent ? 'Update' : 'Add'} Agent
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={ui.buttons.muted}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Agents list */}
      <div>
        <h2>Existing Agents ({agents?.length || 0})</h2>
        {agents?.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No agents created yet. Add your first agent above!</p>
        ) : (
      <div style={{ display: 'grid', gap: 10 }}>
            {agents?.map((agent: Agent) => (
              <div 
                key={agent.id} 
        style={{ ...ui.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{agent.role}</h3>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                    <strong>Model:</strong> {agent.llm_provider_model}
                  </p>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                    <strong>Goal:</strong> {agent.goal}
                  </p>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                    <strong>Backstory:</strong> {agent.backstory}
                  </p>
                  
                  <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {agent.allow_delegation && (
                      <span style={{ padding: '2px 6px', backgroundColor: '#d4edda', color: '#155724', fontSize: '0.8em', borderRadius: '3px' }}>
                        Delegation
                      </span>
                    )}
                    {agent.verbose && (
                      <span style={{ padding: '2px 6px', backgroundColor: '#cce7f8', color: '#0c5460', fontSize: '0.8em', borderRadius: '3px' }}>
                        Verbose
                      </span>
                    )}
                    {agent.cache && (
                      <span style={{ padding: '2px 6px', backgroundColor: '#e2e3e5', color: '#383d41', fontSize: '0.8em', borderRadius: '3px' }}>
                        Cache
                      </span>
                    )}
                    <span style={{ padding: '2px 6px', backgroundColor: '#e2e3e5', color: '#383d41', fontSize: '0.8em', borderRadius: '3px' }}>
                      Temp: {agent.temperature}
                    </span>
                    <span style={{ padding: '2px 6px', backgroundColor: '#e2e3e5', color: '#383d41', fontSize: '0.8em', borderRadius: '3px' }}>
                      Max Iter: {agent.max_iter}
                    </span>
                  </div>
                  
                  <p style={{ margin: '10px 0 0 0', color: '#999', fontSize: '0.8em' }}>
                    Created: {new Date(agent.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleEdit(agent)}
                    style={ui.buttons.info}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(agent)}
                    disabled={deleteMutation.isPending}
                    style={ui.buttons.danger}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;
