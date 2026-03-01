'use client';

import { use } from 'react';
import { Container, Center, Loader } from '@mantine/core';
import { useAuth } from '../../../../lib/auth-context';
import { ProfileView } from '../../../../components/ProfileView';

export default function MemberProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center py="xl">
        <Loader color="indigo" />
      </Center>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <Container size="lg">
      <ProfileView userId={userId} isOwnProfile={isOwnProfile} />
    </Container>
  );
}
