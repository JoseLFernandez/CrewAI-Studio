import { useEffect, useMemo, useState } from 'react';
import { withAuth, useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { ui } from '../lib/ui';
import FlowEditor from '../components/FlowEditor';

interface FlowSummary {
  id: string;
  name?: string | null;
  nodes?: any[];
  edges?: any[];
}

function FlowsPage() {
  const { authFetch } = useAuth();
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [selected, setSelected] = useState<FlowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [listOpen, setListOpen] = useState(true);
  const [listWidth, setListWidth] = useState<number>(320);
  const [resizingList, setResizingList] = useState<boolean>(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/flows');
      if (!res.ok) throw new Error('Failed to load flows');
      const data = await res.json();
      setFlows(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!resizingList) return;
    const onMove = (e: MouseEvent) => {
      const grid = document.getElementById('flows-grid');
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      let next = Math.round(pointerX);
      next = Math.max(220, Math.min(600, next));
      setListWidth(next);
    };
    const onUp = () => setResizingList(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingList]);

  const create = async () => {
    try {
      const res = await authFetch('/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() || undefined, nodes: [], edges: [] })
      });
      if (!res.ok) throw new Error('Failed to create flow');
      const data = await res.json();
      setFlows((prev) => [...prev, data]);
      setSelected(data);
      setNewName('');
    } catch (e) {}
  };

  const remove = async (flow: FlowSummary) => {
    if (!confirm(`Delete flow "${flow.name || flow.id}"?`)) return;
    const res = await authFetch(`/flows/${flow.id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setFlows((prev) => prev.filter((f) => f.id !== flow.id));
    if (selected?.id === flow.id) setSelected(null);
  };

  return (
    <div style={{ ...ui.container, maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
  <Navigation currentPage="flows" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, flex: 1 }}>Flows</h1>
        <button onClick={() => setListOpen((v) => !v)} aria-pressed={!listOpen} aria-label="Toggle flows list">
          {listOpen ? 'Hide list' : 'Show list'}
        </button>
      </div>
  <div id="flows-grid" style={{ display: 'grid', gridTemplateColumns: `${listOpen ? listWidth + 'px' : '0px'} ${listOpen ? '6px' : '0px'} 1fr`, alignItems: 'stretch', gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ ...ui.card, overflow: 'hidden', display: listOpen ? 'flex' : 'none', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Flows</strong>
            <button onClick={() => setListOpen(false)} style={ui.buttons.neutral} aria-label="Hide flows list">Hide</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <label htmlFor="newFlowName" style={{ position: 'absolute', left: -9999 }}>
              New flow name
            </label>
            <input
              id="newFlowName"
              name="newFlowName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New flow name (optional)"
              style={ui.input}
            />
            <button onClick={create} style={ui.buttons.success}>Create</button>
            <button onClick={load} style={ui.buttons.neutral}>Refresh</button>
          </div>
          {loading && <div>Loading...</div>}
          {error && <div style={{ color: '#c00' }}>{error}</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto' }}>
            {flows.map((f) => (
              <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #eee' }}>
                <button onClick={() => setSelected(f)} style={{ ...ui.buttons.link, padding: 0 }}>{f.name || f.id}</button>
                <button onClick={() => remove(f)} style={ui.buttons.danger}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
        {listOpen ? (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={() => setResizingList(true)}
            style={{ width: 6, cursor: 'col-resize', height: '100%', userSelect: 'none' }}
            title="Drag to resize flows list"
          />
        ) : (
          <div />
        )}
        <div style={{ ...ui.card, overflow: 'hidden', display: 'flex', height: '100%', minHeight: 0 }}>
          {selected ? (
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <FlowEditor
                flowId={selected.id}
                initialName={selected.name ?? null}
                listOpen={listOpen}
                onToggleList={() => setListOpen((v) => !v)}
                onSaved={({ name }) => {
                  if (name !== undefined) {
                    setFlows((prev) => prev.map((f) => (f.id === selected.id ? { ...f, name } : f)));
                    setSelected((prev) => (prev ? { ...prev, name: name ?? prev.name } : prev));
                  }
                }}
                onToolsOnlyChange={(enabled) => {
                  if (enabled) setListOpen(false);
                }}
              />
            </div>
          ) : (
            <div style={ui.emptyState}>Select a flow on the left or create a new one.</div>
          )}
        </div>
      </div>
      {!listOpen && (
        <button
          onClick={() => setListOpen(true)}
          aria-label="Show flows list"
          style={{ position: 'absolute', left: 8, top: 70, zIndex: 5, ...ui.buttons.neutral }}
        >
          Show list
        </button>
      )}
    </div>
  );
}

export default withAuth(FlowsPage);
