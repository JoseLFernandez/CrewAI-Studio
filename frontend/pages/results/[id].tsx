import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { withAuth, useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import { ui } from '../../lib/ui';

async function fetchResult(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>, id: string) {
  const res = await authFetch(`/results/${id}`);
  if (!res.ok) throw new Error('Failed to fetch result');
  return res.json();
}

function ResultDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { authFetch } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['result', id],
    queryFn: () => fetchResult(authFetch, id),
    enabled: !!id,
  });

  if (!id) return null;
  if (isLoading) return <div style={ui.container}><Navigation currentPage="results" /><div>Loading...</div></div>;
  if (isError) return <div style={ui.container}><Navigation currentPage="results" /><div style={{color:'#c00'}}>Failed to load result: {(error as Error)?.message}</div></div>;

  const copyOutput = async () => {
    try {
      const text = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
      await navigator.clipboard.writeText(text);
      alert('Output copied to clipboard');
    } catch {}
  };

  return (
    <div style={ui.container}>
      <Navigation currentPage="results" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Result {data.id}</h1>
        <Link href="/results" style={ui.buttons.primary}>← Back to Results</Link>
      </div>
      <div style={{ marginBottom: 10, color: '#6b7280' }}>Crew {data.crew_name} ({data.crew_id}) • {new Date(data.created_at).toLocaleString()}</div>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <div style={ui.sectionHeader}>Inputs</div>
          <pre style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>{JSON.stringify(data.inputs, null, 2)}</pre>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={ui.sectionHeader}>Output</div>
            <button onClick={copyOutput} style={ui.buttons.success}>Copy</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'white', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
            {typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ResultDetailPage);
