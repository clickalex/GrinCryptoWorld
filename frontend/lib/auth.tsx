import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Notification, PublicUser } from '@grincrypto/shared';
import { api, setToken, getToken } from './api';
import { connectWallet, signMessage } from './wallet';

interface AuthCtx {
  user: PublicUser | null;
  loading: boolean;
  notifications: Notification[];
  unread: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWallet: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUser = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const { user } = await api<{ user: PublicUser }>('/auth/me');
      setUser(user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!getToken()) return;
    try {
      const { items, unread } = await api<{ items: Notification[]; unread: number }>('/notifications');
      setNotifications(items);
      setUnread(unread);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);
  useEffect(() => {
    if (!user) { if (pollRef.current) clearInterval(pollRef.current); return; }
    refreshNotifications();
    pollRef.current = setInterval(refreshNotifications, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: PublicUser }>('/auth/login', { body: { email, password } });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api<{ token: string; user: PublicUser }>('/auth/register', { body: { email, password, name } });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const loginWallet = useCallback(async () => {
    const { address } = await connectWallet();
    const { message } = await api<{ message: string }>('/auth/wallet/nonce', { body: { address } });
    const signature = await signMessage(message);
    const res = await api<{ token: string; user: PublicUser }>('/auth/wallet/verify', { body: { address, signature } });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setNotifications([]);
  }, []);

  const markAllRead = useCallback(async () => {
    await api('/notifications/read-all', { method: 'POST' });
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, notifications, unread, login, register, loginWallet, logout, refreshUser, refreshNotifications, markAllRead }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
