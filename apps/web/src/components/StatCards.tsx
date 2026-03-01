'use client';

import { SimpleGrid, Paper, Group, Text, ThemeIcon } from '@mantine/core';
import {
  IconFlame,
  IconTrendingUp,
  IconActivity,
  IconCalendarStats,
} from '@tabler/icons-react';

interface StatCardsProps {
  totalPoints: number;
  pointsThisWeek: number;
  activitiesThisWeek: number;
  currentStreak: number;
}

const stats = [
  { key: 'totalPoints' as const, label: 'Total Points', icon: IconFlame, color: 'teal' },
  { key: 'pointsThisWeek' as const, label: 'Points This Week', icon: IconTrendingUp, color: 'blue' },
  { key: 'activitiesThisWeek' as const, label: 'Activities This Week', icon: IconActivity, color: 'green' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconCalendarStats, color: 'orange' },
];

export function StatCards({ totalPoints, pointsThisWeek, activitiesThisWeek, currentStreak }: StatCardsProps) {
  const values: Record<string, number> = { totalPoints, pointsThisWeek, activitiesThisWeek, currentStreak };

  return (
    <SimpleGrid cols={{ base: 2, md: 4 }}>
      {stats.map((stat) => (
        <Paper key={stat.key} p="md" radius="md" withBorder>
          <Group gap="xs" mb="xs">
            <ThemeIcon variant="light" color={stat.color} size="lg" radius="md">
              <stat.icon size={20} />
            </ThemeIcon>
          </Group>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {stat.label}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {values[stat.key]}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
