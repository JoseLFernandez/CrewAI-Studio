import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, withAuth } from '../context/AuthContext';

type Crew = {
  id: number;
  name: string;
};

async function fetchCrews(authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>): Promise<Crew[]> {
  const res = await authFetch('/api/crews');
  if (!res.ok) throw new Error('Failed to fetch crews');
  return res.json();
}

async function createCrew(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  name: string
): Promise<Crew> {
  const res = await authFetch('/api/crews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create crew');
  return res.json();
}

function CrewsPage() {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: crews, isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => fetchCrews(authFetch),
  });

  const mutation = useMutation({
    mutationFn: (newName: string) => createCrew(authFetch, newName),
    onMutate: async (newName: string) => {
      await queryClient.cancelQueries({ queryKey: ['crews'] });
      const previous = queryClient.getQueryData<Crew[]>(['crews']) || [];
      const optimisticCrew = { id: Date.now(), name: newName };
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      mutation.mutate(name);
      setName('');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Crews</h1>
      <ul>
        {crews?.map((crew) => (
          <li key={crew.id}>{crew.name}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Add Crew</button>
      </form>
    </div>
  );
}

export default withAuth(CrewsPage);
