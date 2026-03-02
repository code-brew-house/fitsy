'use client';

import { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from './auth-client';
import type { UserResponse } from '@fitsy/shared';
import { Role } from '@fitsy/shared';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// BetterAuth's session.user type only includes base fields.
// Our server configures additionalFields (role, clubId, totalPoints)
// which are present at runtime but not in the generated TS type.
interface ExtendedSessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: Date;
  role?: string;
  clubId?: string | null;
  totalPoints?: number;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const sessionUser = session?.user as ExtendedSessionUser | undefined;

  const user: UserResponse | null = sessionUser
    ? {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: (sessionUser.role === 'ADMIN' ? Role.ADMIN : Role.MEMBER),
        clubId: sessionUser.clubId ?? null,
        totalPoints: sessionUser.totalPoints ?? 0,
        avatarUrl: sessionUser.image ?? null,
        createdAt: sessionUser.createdAt
          ? new Date(sessionUser.createdAt).toISOString()
          : new Date().toISOString(),
      }
    : null;

  const logout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading: isPending, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
