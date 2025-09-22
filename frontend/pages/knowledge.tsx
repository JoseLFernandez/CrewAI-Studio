import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';

interface KnowledgeSource {
  id: number;
  name: string;
  description: string;
  source_type: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

const KnowledgePage = () => {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeSource | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source_type: 'text',
    content: '',
    metadata: '{}'
  });

  useEffect(() => {
    fetchKnowledgeSources();
  }, []);

  const fetchKnowledgeSources = async () => {
    try {
      const response = await fetch('/api/knowledge');
      if (response.ok) {
        const data = await response.json();
        setKnowledgeSources(data);
      }
    } catch (error) {
      console.error('Error fetching knowledge sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const knowledgeData = {
        ...formData,
        metadata: JSON.parse(formData.metadata)
      };

      const url = editingKnowledge ? `/api/knowledge/${editingKnowledge.id}` : '/api/knowledge';
      const method = editingKnowledge ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledgeData)
      });

      if (response.ok) {
        fetchKnowledgeSources();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving knowledge source:', error);
    }
  };

  const handleEdit = (knowledge: KnowledgeSource) => {
    setEditingKnowledge(knowledge);
    setFormData({
      name: knowledge.name,
      description: knowledge.description,
      source_type: knowledge.source_type,
      content: knowledge.content,
      metadata: JSON.stringify(knowledge.metadata, null, 2)
    });
    setShowForm(true);
  };

  const handleDelete = async (knowledgeId: number) => {
    if (confirm('Are you sure you want to delete this knowledge source?')) {
      try {
        const response = await fetch(`/api/knowledge/${knowledgeId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchKnowledgeSources();
        }
      } catch (error) {
        console.error('Error deleting knowledge source:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', source_type: 'text', content: '', metadata: '{}' });
    setEditingKnowledge(null);
    setShowForm(false);
  };

  const sourceTypes = [
    { value: 'text', label: 'Text Document' },
    { value: 'pdf', label: 'PDF File' },
    { value: 'url', label: 'Web URL' },
    { value: 'file', label: 'File Upload' },
    { value: 'database', label: 'Database Query' },
    { value: 'api', label: 'API Source' }
  ];

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navigation currentPage="knowledge" />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#212529' }}>📚 Knowledge</h1>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d' }}>
              Manage knowledge sources and documentation for your agents
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
            + Add Knowledge Source
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
            Loading knowledge sources...
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: 20 
          }}>
            {knowledgeSources.map((knowledge) => (
              <div
                key={knowledge.id}
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
                    {knowledge.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEdit(knowledge)}
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
                      onClick={() => handleDelete(knowledge.id)}
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
                  {sourceTypes.find(t => t.value === knowledge.source_type)?.label || knowledge.source_type}
                </div>
                
                <p style={{ 
                  margin: '0 0 12px 0', 
                  color: '#6c757d',
                  fontSize: 14,
                  lineHeight: 1.5 
                }}>
                  {knowledge.description}
                </p>
                
                <div style={{
                  background: '#f8f9fa',
                  padding: 12,
                  borderRadius: 4,
                  marginBottom: 12,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: '#495057',
                  lineHeight: 1.4
                }}>
                  {truncateContent(knowledge.content)}
                </div>
                
                <div style={{ fontSize: 12, color: '#adb5bd' }}>
                  Created: {new Date(knowledge.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {knowledgeSources.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: '#6c757d',
            background: 'white',
            borderRadius: 8,
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>No knowledge sources yet</h3>
            <p style={{ margin: 0 }}>Add your first knowledge source to get started</p>
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
              maxWidth: 600,
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ margin: '0 0 20px 0' }}>
                {editingKnowledge ? 'Edit Knowledge Source' : 'Add New Knowledge Source'}
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
                    Source Type
                  </label>
                  <select
                    value={formData.source_type}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                  >
                    {sourceTypes.map(type => (
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

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={8}
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
                    Metadata (JSON)
                  </label>
                  <textarea
                    value={formData.metadata}
                    onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                    rows={4}
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
                    {editingKnowledge ? 'Update' : 'Create'} Knowledge Source
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

export default KnowledgePage;