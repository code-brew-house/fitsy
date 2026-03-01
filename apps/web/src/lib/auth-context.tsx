'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { UserResponse, AuthResponse, LoginDto, RegisterDto } from '@fitsy/shared';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<UserResponse>('/auth/me');
      setUser(data);
    } catch {
      api.setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (api.getToken()) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (dto: LoginDto) => {
    const res = await api.post<AuthResponse>('/auth/login', dto);
    api.setToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (dto: RegisterDto) => {
    const res = await api.post<AuthResponse>('/auth/register', dto);
    api.setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
