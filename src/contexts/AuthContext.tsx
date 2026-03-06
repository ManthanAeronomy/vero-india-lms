import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  completeOnboarding as apiCompleteOnboarding,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  updatePassword as apiUpdatePassword,
  updateProfile as apiUpdateProfile,
  type AuthUser,
} from '@/api/auth';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  signup: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name: string; email: string }) => Promise<void>;
  updatePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  completeOnboarding: (data: { role: 'admin' | 'team_member' }) => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (data: { email: string; password: string }) => {
    const currentUser = await apiLogin(data);
    setUser(currentUser);
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; password: string }) => {
    const currentUser = await apiSignup(data);
    setUser(currentUser);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { name: string; email: string }) => {
    const currentUser = await apiUpdateProfile(data);
    setUser(currentUser);
  }, []);

  const updatePassword = useCallback(async (data: { currentPassword: string; newPassword: string }) => {
    await apiUpdatePassword(data);
  }, []);

  const completeOnboarding = useCallback(async (data: { role: 'admin' | 'team_member' }) => {
    const currentUser = await apiCompleteOnboarding(data);
    setUser(currentUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, updateProfile, updatePassword, completeOnboarding, refreshSession }),
    [user, loading, login, signup, logout, updateProfile, updatePassword, completeOnboarding, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
