import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withAuth, useAuth } from '../context/AuthContext';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import { ui } from '../lib/ui';

type ResultSummary = {
  id: string;
  crew_id: string;
  crew_name: string;
  created_at: string;
};

type ResultDetail = ResultSummary & {
  inputs: Record<string, string>;
  result: any;
};

async function fetchResults(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>): Promise<ResultSummary[]> {
  const res = await authFetch('/results/');
  if (!res.ok) throw new Error('Failed to fetch results');
  return res.json();
}

async function fetchResult(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>, id: string): Promise<ResultDetail> {
  const res = await authFetch(`/results/${id}`);
  if (!res.ok) throw new Error('Failed to fetch result');
  return res.json();
}

async function deleteResult(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>, id: string): Promise<void> {
  const res = await authFetch(`/results/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete result');
}

function ResultsPage() {
  const { authFetch } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['results'],
    queryFn: () => fetchResults(authFetch),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteResult(authFetch, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });

  if (isLoading) return <div style={ui.container}><Navigation currentPage="results" /><div>Loading...</div></div>;
  if (isError) return <div style={ui.container}><Navigation currentPage="results" /><div style={{color:'#c00'}}>Failed to load results: {(error as Error)?.message}</div></div>;

  return (
    <div style={ui.container}>
      <Navigation currentPage="results" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Results</h1>
        <Link href="/crews" style={ui.buttons.primary}>← Back to Crews</Link>
      </div>
      {data?.length === 0 ? (
        <div style={ui.emptyState}>
          <p style={{ margin: 0 }}>No results yet. Run a crew from the Crews page to see outputs here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {data?.map((r) => (
            <div key={r.id} style={ui.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05em' }}>{r.crew_name}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.9em' }}>Result: {r.id} • Crew: {r.crew_id} • {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/results/${r.id}`} style={ui.buttons.primary}>View</Link>
                  <button onClick={() => del.mutate(r.id)} style={ui.buttons.danger}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(ResultsPage);
