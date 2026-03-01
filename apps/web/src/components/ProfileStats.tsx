'use client';

import { SimpleGrid, Paper, Text, Stack } from '@mantine/core';
import { IconTrophy, IconActivity, IconFlame, IconChartBar } from '@tabler/icons-react';
import type { ProfileResponse } from '@fitsy/shared';

interface ProfileStatsProps {
  profile: ProfileResponse;
}

const statConfig = [
  { key: 'totalPoints' as const, label: 'Total Points', icon: IconTrophy, color: 'yellow' },
  { key: 'activityCount' as const, label: 'Activities Logged', icon: IconActivity, color: 'teal' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconFlame, color: 'orange', suffix: ' days' },
  { key: 'avgPointsPerActivity' as const, label: 'Avg Pts/Activity', icon: IconChartBar, color: 'blue' },
];

export function ProfileStats({ profile }: ProfileStatsProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      {statConfig.map(({ key, label, icon: Icon, color, suffix }) => (
        <Paper key={key} p="md" withBorder radius="md">
          <Stack gap={4} align="center">
            <Icon size={24} color={`var(--mantine-color-${color}-6)`} />
            <Text size="xl" fw={700}>{profile[key]}{suffix || ''}</Text>
            <Text size="xs" c="dimmed" ta="center">{label}</Text>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
