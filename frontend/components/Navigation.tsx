import Link from 'next/link';

interface NavigationProps {
  currentPage?: string;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage }) => {
  const pages = [
    { href: '/crews', label: 'Crews', icon: '👥' },
    { href: '/agents', label: 'Agents', icon: '🤖' },
    { href: '/tasks', label: 'Tasks', icon: '📋' },
    { href: '/tools', label: 'Tools', icon: '🛠️' },
    { href: '/knowledge', label: 'Knowledge', icon: '📚' },
    { href: '/flows', label: 'Flows', icon: '🔄' },
    { href: '/results', label: 'Results', icon: '📊' },
    { href: '/import-export', label: 'Import/Export', icon: '📤' },
  ];

  return (
    <nav style={{
      background: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      padding: '8px 0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 16
        }}>
          <img src="/img/crewai_logo.png" alt="CrewAI Studio" style={{ height: 32, width: 'auto' }} />
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>CrewAI Studio</h1>
        </div>
        
        <div style={{ display: 'flex', gap: 4 }}>
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 6,
                textDecoration: 'none',
                color: currentPage === page.label.toLowerCase() ? '#fff' : '#495057',
                background: currentPage === page.label.toLowerCase() ? '#007bff' : 'transparent',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              <span>{page.icon}</span>
              {page.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
