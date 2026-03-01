'use client';

import { SimpleGrid, Paper, Text, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconTrophy, IconActivity, IconFlame, IconChartBar } from '@tabler/icons-react';
import type { ProfileResponse } from '@fitsy/shared';
import { AnimatedCounter } from './AnimatedCounter';
import { listItemVariants } from '../lib/motion';

interface ProfileStatsProps {
  profile: ProfileResponse;
}

const statConfig = [
  { key: 'totalPoints' as const, label: 'Total Points', icon: IconTrophy, color: 'sunshine' },
  { key: 'activityCount' as const, label: 'Activities Logged', icon: IconActivity, color: 'mint' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconFlame, color: 'energy', suffix: ' days' },
  { key: 'avgPointsPerActivity' as const, label: 'Avg Pts/Activity', icon: IconChartBar, color: 'indigo' },
];

export function ProfileStats({ profile }: ProfileStatsProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      {statConfig.map(({ key, label, icon: Icon, color, suffix }, index) => (
        <motion.div
          key={key}
          variants={listItemVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.08 }}
        >
          <Paper p="md" withBorder radius="lg" shadow="xs">
            <Stack gap={4} align="center">
              <Icon size={24} color={`var(--mantine-color-${color}-6)`} />
              <AnimatedCounter
                value={profile[key]}
                size="xl"
                fw={800}
                suffix={suffix || ''}
              />
              <Text size="xs" c="dimmed" ta="center">{label}</Text>
            </Stack>
          </Paper>
        </motion.div>
      ))}
    </SimpleGrid>
  );
}
