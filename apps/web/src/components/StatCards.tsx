'use client';

import { SimpleGrid, Paper, Group, Text, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import {
  IconFlame,
  IconTrendingUp,
  IconActivity,
  IconTrophy,
} from '@tabler/icons-react';
import { listItemVariants } from '../lib/motion';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardsProps {
  totalPoints: number;
  pointsThisWeek: number;
  activitiesThisWeek: number;
  currentStreak: number;
}

const stats = [
  { key: 'pointsThisWeek' as const, label: 'Points This Week', icon: IconTrendingUp, color: 'energy', suffix: '' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconFlame, color: 'coral', suffix: 'd' },
  { key: 'activitiesThisWeek' as const, label: 'Activities', icon: IconActivity, color: 'mint', suffix: '' },
  { key: 'totalPoints' as const, label: 'Total Points', icon: IconTrophy, color: 'indigo', suffix: '' },
];

export function StatCards({ totalPoints, pointsThisWeek, activitiesThisWeek, currentStreak }: StatCardsProps) {
  const values: Record<string, number> = { totalPoints, pointsThisWeek, activitiesThisWeek, currentStreak };

  return (
    <SimpleGrid cols={{ base: 2, md: 4 }}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          variants={listItemVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.08 }}
        >
          <Paper p="lg" radius="lg" shadow="xs" withBorder h="100%">
            <Group gap="xs" mb="xs">
              <ThemeIcon variant="light" color={stat.color} size="lg" radius="md">
                <stat.icon size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {stat.label}
            </Text>
            <AnimatedCounter
              value={values[stat.key]}
              size="xl"
              fw={800}
              mt={4}
              suffix={stat.suffix}
            />
          </Paper>
        </motion.div>
      ))}
    </SimpleGrid>
  );
}
