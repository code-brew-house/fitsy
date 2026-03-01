'use client';

import { Group, Avatar, Stack, Text, Badge, ActionIcon } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import type { ProfileResponse } from '@fitsy/shared';

interface ProfileHeaderProps {
  profile: ProfileResponse;
  isOwnProfile: boolean;
  onSettingsClick?: () => void;
}

export function ProfileHeader({ profile, isOwnProfile, onSettingsClick }: ProfileHeaderProps) {
  const initial = profile.name?.charAt(0)?.toUpperCase() || '?';
  const memberSince = new Date(profile.memberSince).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Group justify="space-between" align="flex-start">
      <Group gap="md">
        <Avatar src={profile.avatarUrl} color="indigo" radius="xl" size={80}>
          <Text size="xl" fw={700}>{initial}</Text>
        </Avatar>
        <Stack gap={4}>
          <Group gap="sm">
            <Text size="xl" fw={700}>{profile.name}</Text>
            <Badge color={profile.role === 'ADMIN' ? 'indigo' : 'gray'} variant="light" size="sm">
              {profile.role}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">Member since {memberSince}</Text>
        </Stack>
      </Group>
      {isOwnProfile && onSettingsClick && (
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onSettingsClick}>
          <IconSettings size={20} />
        </ActionIcon>
      )}
    </Group>
  );
}
