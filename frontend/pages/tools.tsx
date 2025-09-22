import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';

interface Tool {
  id: number;
  name: string;
  description: string;
  tool_type: string;
  parameters: Record<string, any>;
  created_at: string;
}

const ToolsPage = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tool_type: 'custom',
    parameters: '{}'
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const data = await response.json();
        setTools(data);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const toolData = {
        ...formData,
        parameters: JSON.parse(formData.parameters)
      };

      const url = editingTool ? `/api/tools/${editingTool.id}` : '/api/tools';
      const method = editingTool ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });

      if (response.ok) {
        fetchTools();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving tool:', error);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description,
      tool_type: tool.tool_type,
      parameters: JSON.stringify(tool.parameters, null, 2)
    });
    setShowForm(true);
  };

  const handleDelete = async (toolId: number) => {
    if (confirm('Are you sure you want to delete this tool?')) {
      try {
        const response = await fetch(`/api/tools/${toolId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchTools();
        }
      } catch (error) {
        console.error('Error deleting tool:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', tool_type: 'custom', parameters: '{}' });
    setEditingTool(null);
    setShowForm(false);
  };

  const toolTypes = [
    { value: 'custom', label: 'Custom Tool' },
    { value: 'api', label: 'API Tool' },
    { value: 'search', label: 'Search Tool' },
    { value: 'scraper', label: 'Web Scraper' },
    { value: 'file', label: 'File Tool' },
    { value: 'code', label: 'Code Interpreter' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navigation currentPage="tools" />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#212529' }}>🛠️ Tools</h1>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d' }}>
              Manage custom tools and integrations for your agents
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + Add Tool
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
            Loading tools...
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: 20 
          }}>
            {tools.map((tool) => (
              <div
                key={tool.id}
                style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #dee2e6'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: 12 
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 18, 
                    fontWeight: 600,
                    color: '#212529' 
                  }}>
                    {tool.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEdit(tool)}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id)}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#495057',
                  marginBottom: 8
                }}>
                  {toolTypes.find(t => t.value === tool.tool_type)?.label || tool.tool_type}
                </div>
                
                <p style={{ 
                  margin: '0 0 12px 0', 
                  color: '#6c757d',
                  fontSize: 14,
                  lineHeight: 1.5 
                }}>
                  {tool.description}
                </p>
                
                <div style={{ fontSize: 12, color: '#adb5bd' }}>
                  Created: {new Date(tool.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {tools.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: '#6c757d',
            background: 'white',
            borderRadius: 8,
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛠️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>No tools yet</h3>
            <p style={{ margin: 0 }}>Create your first tool to get started</p>
          </div>
        )}

        {showForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ margin: '0 0 20px 0' }}>
                {editingTool ? 'Edit Tool' : 'Add New Tool'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                    Type
                  </label>
                  <select
                    value={formData.tool_type}
                    onChange={(e) => setFormData({ ...formData, tool_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                  >
                    {toolTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      fontSize: 14,
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                    Parameters (JSON)
                  </label>
                  <textarea
                    value={formData.parameters}
                    onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500
                    }}
                  >
                    {editingTool ? 'Update' : 'Create'} Tool
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;