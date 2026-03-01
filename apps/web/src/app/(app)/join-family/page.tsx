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
import { IconUserPlus } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { FamilyResponse } from '@fitsy/shared';

export default function JoinFamilyPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    try {
      await api.post<FamilyResponse>('/family/join', { inviteCode: inviteCode.trim() });
      notifications.show({
        title: 'Joined family!',
        message: 'You have successfully joined the family.',
        color: 'teal',
      });
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to join family',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" mt="xl">
      <Stack align="center" gap="lg">
        <IconUserPlus size={48} color="var(--mantine-color-teal-6)" />
        <Title order={2} ta="center">
          Join a Family
        </Title>
        <Text c="dimmed" ta="center">
          Enter the invite code shared by your family admin.
        </Text>

        <Paper w="100%" p="lg" radius="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Invite Code"
                placeholder="e.g. ABC12345"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.currentTarget.value)}
                required
              />
              <Button
                type="submit"
                color="teal"
                fullWidth
                loading={loading}
              >
                Join Family
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="sm" c="dimmed">
          Or{' '}
          <Anchor component="button" type="button" size="sm" onClick={() => router.push('/create-family')}>
            create a new family
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
}
