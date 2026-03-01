'use client';

import { Container, Center, Loader } from '@mantine/core';
import { useAuth } from '../../../lib/auth-context';
import { ProfileView } from '../../../components/ProfileView';

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <Center py="xl">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Container size="lg">
      <ProfileView userId={user.id} isOwnProfile={true} />
    </Container>
  );
}
