import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from 'react';
import { useRouter } from 'next/router';

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

interface AuthContextType {
  user: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  refreshToken: null,
  login: async () => {},
  logout: async () => {},
  refresh: async () => null,
  authFetch: async (input: RequestInfo, init?: RequestInit) => fetch(input, init),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration - load tokens from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAccessToken(localStorage.getItem('accessToken'));
      setRefreshToken(localStorage.getItem('refreshToken'));
      setIsHydrated(true);
    }
  }, []);

  const saveTokens = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  };

  const login = useCallback(async (username: string, password: string) => {
    console.log('Login attempt:', { username, apiBase });
    const body = new URLSearchParams({ username, password });
    console.log('Request body:', body.toString());
    
    try {
      const res = await fetch(`${apiBase}/auth/login`, { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body 
      });
      
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.log('Error response:', errorText);
        throw new Error('Login failed');
      }
      
      const data = await res.json();
      console.log('Login successful:', data);
      saveTokens(data.access_token, data.refresh_token);
      setUser(username);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    if (accessToken) {
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, [accessToken]);

  const refresh = useCallback(async () => {
    if (!refreshToken) return null;
    const res = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      await logout();
      return null;
    }
    const data = await res.json();
    saveTokens(data.access_token, data.refresh_token);
    return data.access_token as string;
  }, [refreshToken, logout]);

  const authFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      // Convert relative URLs to absolute URLs
      const url = typeof input === 'string' && input.startsWith('/') 
        ? `${apiBase}${input}` 
        : input;
      
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string>) || {},
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      let res = await fetch(url, { ...init, headers });
      if (res.status === 401 || res.status === 403) {
        const newToken = await refresh();
        if (!newToken) throw new Error('Unauthorized');
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...init, headers });
        if (res.status === 401 || res.status === 403) {
          await logout();
          throw new Error('Unauthorized');
        }
      }
      return res;
    },
    [accessToken, refresh, logout, apiBase]
  );

  return (
    <AuthContext.Provider
      value={{ user, accessToken, refreshToken, login, logout, refresh, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export function withAuth<P extends {}>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    const { accessToken } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      if (isMounted && !accessToken) {
        router.replace('/login');
      }
    }, [accessToken, router, isMounted]);

    // Prevent hydration mismatch by not rendering until mounted
    if (!isMounted) {
      return <div>Loading...</div>;
    }

    if (!accessToken) {
      return <div>Redirecting to login...</div>;
    }
    return <Component {...props} />;
  };
}
