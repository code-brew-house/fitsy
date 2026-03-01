'use client';

import Link from 'next/link';
import { Group, Avatar, Text } from '@mantine/core';

interface UserLinkProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  size?: 'xs' | 'sm' | 'md';
  fw?: number;
}

export function UserLink({ userId, name, avatarUrl, showAvatar = false, size = 'sm', fw = 600 }: UserLinkProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  if (showAvatar) {
    return (
      <Link href={`/profile/${userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Group gap="sm" wrap="nowrap" style={{ cursor: 'pointer' }}>
          <Avatar src={avatarUrl} color="indigo" radius="xl" size={size}>
            {initial}
          </Avatar>
          <Text size={size} fw={fw}>{name}</Text>
        </Group>
      </Link>
    );
  }

  return (
    <Text
      component={Link}
      href={`/profile/${userId}`}
      span
      fw={fw}
      size={size}
      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
    >
      {name}
    </Text>
  );
}
