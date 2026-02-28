'use client';

import { Group, Avatar, Text, Box } from '@mantine/core';
import type { ActivityLogResponse } from '@fitsy/shared';

interface FeedItemProps {
  activity: ActivityLogResponse;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function FeedItem({ activity }: FeedItemProps) {
  const initial = activity.userName?.charAt(0)?.toUpperCase() || '?';

  return (
    <Group gap="sm" py="xs" wrap="nowrap">
      <Avatar color="teal" radius="xl" size="md">
        {initial}
      </Avatar>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" lineClamp={1}>
          <Text span fw={600}>{activity.userName}</Text>
          {' '}did{' '}
          <Text span fw={600}>{activity.activityTypeName}</Text>
        </Text>
        <Group gap="xs">
          <Text size="xs" c="teal" fw={600}>
            +{activity.pointsEarned} pts
          </Text>
          <Text size="xs" c="dimmed">
            {timeAgo(activity.createdAt)}
          </Text>
        </Group>
      </Box>
    </Group>
  );
}
