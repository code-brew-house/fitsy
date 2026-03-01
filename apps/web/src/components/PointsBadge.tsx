'use client';

import { Badge } from '@mantine/core';
import { IconFlame } from '@tabler/icons-react';
import { useAuth } from '../lib/auth-context';

export function PointsBadge() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Badge size="lg" variant="light" color="energy" leftSection={<IconFlame size={14} />}>
      {user.totalPoints} pts
    </Badge>
  );
}
