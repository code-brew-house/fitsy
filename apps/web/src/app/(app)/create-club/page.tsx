'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  TextInput,
  Button,
  Paper,
  Stack,
  Anchor,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUsers } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { ClubResponse } from '@fitsy/shared';

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.post<ClubResponse>('/club', { name: name.trim() });
      notifications.show({
        title: 'Club created!',
        message: 'Your club has been created successfully.',
        color: 'indigo',
      });
      window.location.href = '/dashboard';
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to create club',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" mt="xl">
      <Stack align="center" gap="lg">
        <IconUsers size={48} color="var(--mantine-color-indigo-6)" />
        <Title order={2} ta="center">
          Create Your Club
        </Title>
        <Text c="dimmed" ta="center">
          Start a new club group and invite your members to join.
        </Text>

        <Paper w="100%" p="lg" radius="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Club Name"
                placeholder="e.g. Smith Fitness Club"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                required
              />
              <Button
                type="submit"
                color="indigo"
                fullWidth
                loading={loading}
              >
                Create Club
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="sm" c="dimmed">
          Or{' '}
          <Anchor component="button" type="button" size="sm" onClick={() => router.push('/join-club')}>
            join an existing club
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
}
