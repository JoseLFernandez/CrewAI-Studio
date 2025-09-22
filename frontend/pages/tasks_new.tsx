import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';

interface Task {
  id: string;
  description: string;
  expected_output: string;
  async_execution: boolean;
  agent_id: string | null;
  context_from_async_tasks_ids: string[];
  context_from_sync_tasks_ids: string[];
  created_at: string;
}

interface TaskFormData {
  description: string;
  expected_output: string;
  async_execution: boolean;
  agent_id: string | null;
  context_from_async_tasks_ids: string[];
  context_from_sync_tasks_ids: string[];
}

const TasksPage: React.FC = () => {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    description: '',
    expected_output: '',
    async_execution: false,
    agent_id: null,
    context_from_async_tasks_ids: [],
    context_from_sync_tasks_ids: []
  });

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await authFetch('/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    }
  });

  const { data: agents = [] } = useQuery({
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
    mutationFn: async (newTask: TaskFormData) => {
      const response = await authFetch('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateForm(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Task) => {
      const response = await authFetch(`/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authFetch(`/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const resetForm = () => {
    setFormData({
      description: '',
      expected_output: '',
      async_execution: false,
      agent_id: null,
      context_from_async_tasks_ids: [],
      context_from_sync_tasks_ids: []
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      description: task.description,
      expected_output: task.expected_output,
      async_execution: task.async_execution,
      agent_id: task.agent_id,
      context_from_async_tasks_ids: task.context_from_async_tasks_ids,
      context_from_sync_tasks_ids: task.context_from_sync_tasks_ids
    });
    setShowCreateForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateMutation.mutate({ ...editingTask, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingTask(null);
    resetForm();
  };

  const handleDelete = (task: Task) => {
    if (confirm(`Are you sure you want to delete this task?`)) {
      deleteMutation.mutate(task.id);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'No agent assigned';
    const agent = agents.find((a: any) => a.id === agentId);
    return agent ? agent.role : 'Unknown agent';
  };

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <Navigation currentPage="tasks" />

      <h1>Tasks Management</h1>
      
      {/* Add new task form */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
        {!showCreateForm ? (
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Add Task
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                required
              />
            </div>

            <div>
              <label htmlFor="taskNewExpectedOutput" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Expected Output *</label>
              <textarea
                id="taskNewExpectedOutput"
                name="expected_output"
                value={formData.expected_output}
                onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label htmlFor="taskNewAgent" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assigned Agent</label>
                <select
                  id="taskNewAgent"
                  name="agent_id"
                  value={formData.agent_id || ''}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value || null })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">No agent assigned</option>
                  {agents.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.role}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label htmlFor="taskNewAsync" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    id="taskNewAsync"
                    name="async_execution"
                    type="checkbox"
                    checked={formData.async_execution}
                    onChange={(e) => setFormData({ ...formData, async_execution: e.target.checked })}
                  />
                  Async Execution
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                {editingTask ? 'Update' : 'Add'} Task
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tasks list */}
      <div>
        <h2>Existing Tasks ({tasks?.length || 0})</h2>
        {tasks?.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No tasks created yet. Add your first task above!</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {tasks?.map((task: Task) => (
              <div 
                key={task.id} 
                style={{ 
                  padding: '15px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <h3 style={{ margin: '0', color: '#333' }}>Task</h3>
                    {task.async_execution && (
                      <span style={{ padding: '2px 6px', backgroundColor: '#fff3cd', color: '#856404', fontSize: '0.8em', borderRadius: '3px' }}>
                        Async
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                    <strong>Agent:</strong> {getAgentName(task.agent_id)}
                  </p>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                    <strong>Description:</strong> {task.description}
                  </p>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                    <strong>Expected Output:</strong> {task.expected_output}
                  </p>
                  
                  {(task.context_from_async_tasks_ids.length > 0 || task.context_from_sync_tasks_ids.length > 0) && (
                    <div style={{ marginTop: '10px' }}>
                      <strong style={{ color: '#666', fontSize: '0.9em' }}>Context Dependencies:</strong>
                      <div style={{ marginTop: '5px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {task.context_from_async_tasks_ids.map(id => (
                          <span key={id} style={{ padding: '2px 6px', backgroundColor: '#fff3cd', color: '#856404', fontSize: '0.8em', borderRadius: '3px' }}>
                            Async: {id.slice(0, 8)}...
                          </span>
                        ))}
                        {task.context_from_sync_tasks_ids.map(id => (
                          <span key={id} style={{ padding: '2px 6px', backgroundColor: '#cce7f8', color: '#0c5460', fontSize: '0.8em', borderRadius: '3px' }}>
                            Sync: {id.slice(0, 8)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p style={{ margin: '10px 0 0 0', color: '#999', fontSize: '0.8em' }}>
                    Created: {new Date(task.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleEdit(task)}
                    style={{ padding: '8px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(task)}
                    disabled={deleteMutation.isPending}
                    style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
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

export default TasksPage;
