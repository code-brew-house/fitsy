'use client';

import { SimpleGrid, Paper, Group, Text, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
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
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Paper p="md" radius="md" withBorder h="100%">
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
        </motion.div>
      ))}
    </SimpleGrid>
  );
}
