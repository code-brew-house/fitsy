'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  SegmentedControl,
  Button,
  Stack,
  Group,
  Text,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUser } from '@tabler/icons-react';
import { useAuth } from '../../../lib/auth-context';

export default function ProfilePage() {
  const { user } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Profile update endpoint is not yet available.
      // For now, just save the color scheme (which is client-side).
      notifications.show({
        title: 'Preferences Saved',
        message: 'Your color scheme preference has been updated.',
        color: 'teal',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="sm">
      <Stack gap="lg">
        <Title order={2}>
          <Group gap="xs">
            <IconUser size={28} />
            Profile
          </Group>
        </Title>

        <Paper p="xl" withBorder radius="md">
          <Stack gap="md">
            <TextInput
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              placeholder="Your display name"
            />

            <TextInput
              label="Email"
              value={user?.email ?? ''}
              disabled
              readOnly
            />

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Color Scheme
              </Text>
              <SegmentedControl
                value={colorScheme}
                onChange={(value) =>
                  setColorScheme(value as 'light' | 'dark' | 'auto')
                }
                data={[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                  { label: 'Auto', value: 'auto' },
                ]}
                color="teal"
              />
            </Stack>

            <Group justify="flex-end" mt="sm">
              <Button color="teal" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
