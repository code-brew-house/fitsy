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
import { useAuth } from '../../../lib/auth-context';
import type { FamilyResponse } from '@fitsy/shared';

export default function CreateFamilyPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.post<FamilyResponse>('/family', { name: name.trim() });
      await refreshUser();
      notifications.show({
        title: 'Family created!',
        message: 'Your family has been created successfully.',
        color: 'teal',
      });
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to create family',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" mt="xl">
      <Stack align="center" gap="lg">
        <IconUsers size={48} color="var(--mantine-color-teal-6)" />
        <Title order={2} ta="center">
          Create Your Family
        </Title>
        <Text c="dimmed" ta="center">
          Start a new family group and invite your members to join.
        </Text>

        <Paper w="100%" p="lg" radius="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Family Name"
                placeholder="e.g. The Smiths"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                required
              />
              <Button
                type="submit"
                color="teal"
                fullWidth
                loading={loading}
              >
                Create Family
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="sm" c="dimmed">
          Or{' '}
          <Anchor component="button" type="button" size="sm" onClick={() => router.push('/join-family')}>
            join an existing family
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
}
