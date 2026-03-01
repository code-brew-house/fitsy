'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../../lib/auth-context';
import { AppShell } from '../../components/AppShell';

const FAMILY_SETUP_PATHS = ['/create-family', '/join-family', '/setup-family'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (!user.familyId && !FAMILY_SETUP_PATHS.includes(pathname)) {
      router.push('/setup-family');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader color="teal" size="lg" />
      </Center>
    );
  }

  if (!user) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
