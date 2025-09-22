import { useState, useEffect } from 'react';
import { useAuth, withAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import Link from 'next/link';

interface Stats {
  crews: number;
  agents: number;
  tasks: number;
  tools: number;
  knowledge: number;
  flows: number;
  results: number;
}

function IndexPage() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<Stats>({
    crews: 0,
    agents: 0,
    tasks: 0,
    tools: 0,
    knowledge: 0,
    flows: 0,
    results: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const responses = await Promise.allSettled([
        authFetch('/crews'),
        authFetch('/agents'),
        authFetch('/tasks'),
        authFetch('/tools'),
        authFetch('/knowledge'),
        authFetch('/flows'),
        authFetch('/results')
      ]);

      const newStats: Stats = {
        crews: 0,
        agents: 0,
        tasks: 0,
        tools: 0,
        knowledge: 0,
        flows: 0,
        results: 0
      };

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.ok) {
          response.value.json().then(data => {
            const keys = Object.keys(newStats) as (keyof Stats)[];
            if (Array.isArray(data)) {
              newStats[keys[index]] = data.length;
            }
          });
        }
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { href: '/crews', label: 'Create Crew', icon: '👥', description: 'Build a new AI crew' },
    { href: '/agents', label: 'Add Agent', icon: '🤖', description: 'Define agent roles' },
    { href: '/tasks', label: 'Create Task', icon: '📋', description: 'Set up workflows' },
    { href: '/flows', label: 'Design Flow', icon: '🔄', description: 'Visual flow builder' },
  ];

  const statCards = [
    { key: 'crews' as keyof Stats, label: 'Crews', icon: '👥', color: '#007bff' },
    { key: 'agents' as keyof Stats, label: 'Agents', icon: '🤖', color: '#28a745' },
    { key: 'tasks' as keyof Stats, label: 'Tasks', icon: '📋', color: '#ffc107' },
    { key: 'tools' as keyof Stats, label: 'Tools', icon: '🛠️', color: '#6f42c1' },
    { key: 'knowledge' as keyof Stats, label: 'Knowledge', icon: '📚', color: '#fd7e14' },
    { key: 'flows' as keyof Stats, label: 'Flows', icon: '🔄', color: '#20c997' },
    { key: 'results' as keyof Stats, label: 'Results', icon: '📊', color: '#dc3545' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navigation currentPage="" />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 24 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <img 
            src="/img/crewai_logo.png" 
            alt="CrewAI Studio" 
            style={{ height: 64, width: 'auto', marginBottom: 16 }} 
          />
          <h1 style={{ 
            margin: 0, 
            fontSize: 36, 
            fontWeight: 700, 
            color: '#212529',
            marginBottom: 8 
          }}>
            Welcome to CrewAI Studio
          </h1>
          <p style={{ 
            fontSize: 18, 
            color: '#6c757d',
            maxWidth: 600,
            margin: '0 auto'
          }}>
            Build, manage, and deploy AI agent crews with visual flow editing, 
            comprehensive tooling, and seamless collaboration.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: 16,
          marginBottom: 40 
        }}>
          {statCards.map((card) => (
            <div
              key={card.key}
              style={{
                background: 'white',
                borderRadius: 8,
                padding: 20,
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '1px solid #dee2e6'
              }}
            >
              <div style={{ 
                fontSize: 32, 
                marginBottom: 8,
                opacity: loading ? 0.5 : 1
              }}>
                {card.icon}
              </div>
              <div style={{ 
                fontSize: 24, 
                fontWeight: 600, 
                color: card.color,
                marginBottom: 4
              }}>
                {loading ? '—' : stats[card.key]}
              </div>
              <div style={{ 
                fontSize: 14, 
                color: '#6c757d',
                fontWeight: 500
              }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#212529',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            Quick Actions
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: 20 
          }}>
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  textDecoration: 'none',
                  background: 'white',
                  borderRadius: 8,
                  padding: 24,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #dee2e6',
                  transition: 'all 0.2s ease',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12,
                  marginBottom: 8
                }}>
                  <span style={{ fontSize: 24 }}>{action.icon}</span>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 18, 
                    fontWeight: 600,
                    color: '#212529'
                  }}>
                    {action.label}
                  </h3>
                </div>
                <p style={{ 
                  margin: 0, 
                  color: '#6c757d',
                  fontSize: 14
                }}>
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Section - Placeholder */}
        <div style={{
          background: 'white',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            fontSize: 20, 
            fontWeight: 600, 
            color: '#212529',
            marginBottom: 12
          }}>
            Getting Started
          </h2>
          <p style={{ color: '#6c757d', marginBottom: 16 }}>
            New to CrewAI Studio? Start by creating your first crew or exploring the visual flow editor.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/crews"
              style={{
                background: '#007bff',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Create Your First Crew
            </Link>
            <Link
              href="/flows"
              style={{
                background: '#28a745',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Try Flow Editor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(IndexPage);
