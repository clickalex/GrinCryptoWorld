import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Notification, PublicUser } from '@grincrypto/shared';
import { api } from './api';
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
    try {
      const { user } = await api<{ user: PublicUser }>('/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
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

  // Register this browser with OneSignal so push notifications can reach it
  // (no-op unless NEXT_PUBLIC_ONESIGNAL_APP_ID is configured).
  useEffect(() => {
    if (!user) return;
    try {
      (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
        try {
          const playerId = await OneSignal.getUserId?.();
          if (playerId) await api('/notifications/subscribe', { body: { playerId } });
        } catch { /* noop */ }
      });
    } catch { /* noop */ }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: PublicUser }>('/auth/login', { body: { email, password } });
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api<{ token: string; user: PublicUser }>('/auth/register', { body: { email, password, name } });
    setUser(res.user);
  }, []);

  const loginWallet = useCallback(async () => {
    const { address } = await connectWallet();
    const { message } = await api<{ message: string }>('/auth/wallet/nonce', { body: { address } });
    const signature = await signMessage(message);
    const res = await api<{ token: string; user: PublicUser }>('/auth/wallet/verify', { body: { address, signature } });
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    // Clear the httpOnly cookie server-side (best-effort) and reset local state.
    api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    setNotifications([]);
    setUnread(0);
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
