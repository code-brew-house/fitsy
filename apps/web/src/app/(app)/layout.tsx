'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../../lib/auth-context';
import { AppShell } from '../../components/AppShell';

const CLUB_SETUP_PATHS = ['/create-club', '/join-club', '/setup-club'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (!user.clubId && !CLUB_SETUP_PATHS.includes(pathname)) {
      router.push('/setup-club');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader color="indigo" size="lg" />
      </Center>
    );
  }

  if (!user) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
