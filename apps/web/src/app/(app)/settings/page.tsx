'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  PasswordInput,
  Button,
  Stack,
  Group,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSettings } from '@tabler/icons-react';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      // Change password endpoint is not yet available.
      notifications.show({
        title: 'Not Available',
        message: 'Change password functionality is not yet implemented.',
        color: 'yellow',
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
            <IconSettings size={28} />
            Settings
          </Group>
        </Title>

        <Paper p="xl" withBorder radius="md">
          <Stack gap="md">
            <Title order={4}>Change Password</Title>

            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              placeholder="Enter current password"
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              placeholder="Min. 8 characters"
              error={passwordTooShort ? 'Password must be at least 8 characters' : undefined}
            />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              placeholder="Confirm new password"
              error={passwordsMismatch ? 'Passwords do not match' : undefined}
            />

            <Group justify="flex-end" mt="sm">
              <Button
                color="indigo"
                onClick={handleSubmit}
                loading={saving}
                disabled={!canSubmit}
              >
                Update Password
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
