import { useState } from 'react';
import Navigation from '../components/Navigation';

const ImportExportPage = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportType, setExportType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Successfully imported ${result.imported || 'data'}. Please refresh other pages to see changes.` 
        });
        setImportFile(null);
        if (document.querySelector('input[type="file"]') as HTMLInputElement) {
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        }
      } else {
        const error = await response.text();
        setMessage({ type: 'error', text: `Import failed: ${error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Import error: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/export?type=${exportType}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crewai-studio-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: 'success', text: 'Export completed successfully!' });
      } else {
        const error = await response.text();
        setMessage({ type: 'error', text: `Export failed: ${error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Export error: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const exportOptions = [
    { value: 'all', label: 'Complete Workspace', description: 'All crews, agents, tasks, tools, and knowledge' },
    { value: 'crews', label: 'Crews Only', description: 'Crews and their configurations' },
    { value: 'agents', label: 'Agents Only', description: 'Agent definitions and settings' },
    { value: 'tasks', label: 'Tasks Only', description: 'Task definitions and dependencies' },
    { value: 'tools', label: 'Tools Only', description: 'Custom tools and integrations' },
    { value: 'knowledge', label: 'Knowledge Only', description: 'Knowledge sources and documentation' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navigation currentPage="import-export" />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 24 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#212529' }}>📤 Import & Export</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6c757d' }}>
            Backup, share, and migrate your CrewAI Studio workspace
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #dee2e6',
          marginBottom: 32 
        }}>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              background: activeTab === 'import' ? '#007bff' : 'transparent',
              color: activeTab === 'import' ? 'white' : '#495057',
              border: 'none',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500,
              borderRadius: '6px 6px 0 0'
            }}
          >
            📥 Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            style={{
              background: activeTab === 'export' ? '#007bff' : 'transparent',
              color: activeTab === 'export' ? 'white' : '#495057',
              border: 'none',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500,
              borderRadius: '6px 6px 0 0'
            }}
          >
            📤 Export
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            padding: 16,
            borderRadius: 6,
            marginBottom: 24,
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 32,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 22, fontWeight: 600 }}>
              Import Workspace
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6c757d', lineHeight: 1.5 }}>
              Upload a previously exported JSON file to restore crews, agents, tasks, tools, and knowledge sources.
              This will merge with your existing workspace.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontWeight: 500,
                color: '#495057' 
              }}>
                Select Export File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #ced4da',
                  borderRadius: 6,
                  background: '#f8f9fa',
                  cursor: 'pointer'
                }}
              />
              {importFile && (
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 14, 
                  color: '#495057',
                  background: '#e9ecef',
                  padding: '8px 12px',
                  borderRadius: 4
                }}>
                  Selected: {importFile.name} ({Math.round(importFile.size / 1024)}KB)
                </div>
              )}
            </div>

            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: 6,
              padding: 16,
              marginBottom: 24
            }}>
              <strong style={{ color: '#856404' }}>⚠️ Important:</strong>
              <ul style={{ margin: '8px 0 0 0', color: '#856404' }}>
                <li>Importing will merge data with your existing workspace</li>
                <li>Duplicate names may be automatically renamed</li>
                <li>Large files may take some time to process</li>
                <li>Consider backing up your current workspace first</li>
              </ul>
            </div>

            <button
              onClick={handleImport}
              disabled={!importFile || loading}
              style={{
                background: (!importFile || loading) ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 6,
                cursor: (!importFile || loading) ? 'not-allowed' : 'pointer',
                fontSize: 16,
                fontWeight: 500,
                width: '100%'
              }}
            >
              {loading ? 'Importing...' : 'Import Workspace'}
            </button>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 32,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 22, fontWeight: 600 }}>
              Export Workspace
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6c757d', lineHeight: 1.5 }}>
              Download your workspace as a JSON file for backup or sharing. 
              Choose what to include in your export.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 12, 
                fontWeight: 500,
                color: '#495057' 
              }}>
                Export Options
              </label>
              
              <div style={{ display: 'grid', gap: 12 }}>
                {exportOptions.map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 16,
                      border: `2px solid ${exportType === option.value ? '#007bff' : '#dee2e6'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: exportType === option.value ? '#f0f8ff' : 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="exportType"
                      value={option.value}
                      checked={exportType === option.value}
                      onChange={(e) => setExportType(e.target.value)}
                      style={{ marginRight: 12 }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, color: '#212529' }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: 14, color: '#6c757d', marginTop: 2 }}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{
              background: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: 6,
              padding: 16,
              marginBottom: 24
            }}>
              <strong style={{ color: '#0c5460' }}>💡 Export Info:</strong>
              <ul style={{ margin: '8px 0 0 0', color: '#0c5460' }}>
                <li>Exports are saved as JSON files with timestamp</li>
                <li>Files can be imported into any CrewAI Studio instance</li>
                <li>Sensitive data like API keys are excluded for security</li>
                <li>Export includes all configurations and relationships</li>
              </ul>
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              style={{
                background: loading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16,
                fontWeight: 500,
                width: '100%'
              }}
            >
              {loading ? 'Exporting...' : `Export ${exportOptions.find(o => o.value === exportType)?.label}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExportPage;