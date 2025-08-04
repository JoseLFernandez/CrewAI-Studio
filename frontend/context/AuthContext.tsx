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
  const [accessToken, setAccessToken] = useState<string | null>(
    typeof window === 'undefined' ? null : localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    typeof window === 'undefined' ? null : localStorage.getItem('refreshToken')
  );
  const [user, setUser] = useState<string | null>(null);

  const saveTokens = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  };

  const login = useCallback(async (username: string, password: string) => {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${apiBase}/auth/login`, { method: 'POST', body });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    saveTokens(data.access_token, data.refresh_token);
    setUser(username);
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
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string>) || {},
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      let res = await fetch(input, { ...init, headers });
      if (res.status === 401 || res.status === 403) {
        const newToken = await refresh();
        if (!newToken) throw new Error('Unauthorized');
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(input, { ...init, headers });
        if (res.status === 401 || res.status === 403) {
          await logout();
          throw new Error('Unauthorized');
        }
      }
      return res;
    },
    [accessToken, refresh, logout]
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

export function withAuth<P>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    const { accessToken } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!accessToken) {
        router.replace('/login');
      }
    }, [accessToken, router]);

    if (!accessToken) {
      return null;
    }
    return <Component {...props} />;
  };
}
