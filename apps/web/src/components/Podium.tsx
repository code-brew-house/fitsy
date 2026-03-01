'use client';

import { motion } from 'framer-motion';
import { Avatar, Stack, Text, Group, Box } from '@mantine/core';
import { podiumBounceVariants } from '../lib/motion';
import { AnimatedCounter } from './AnimatedCounter';

interface PodiumEntry {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  totalPoints: number;
}

interface PodiumProps {
  entries: PodiumEntry[];
}

const podiumConfig = [
  { position: 1, height: 80, avatarSize: 52, color: '#A4A6B8', label: '2nd' },
  { position: 0, height: 100, avatarSize: 64, color: '#FECA57', label: '1st' },
  { position: 2, height: 64, avatarSize: 52, color: '#E17055', label: '3rd' },
];

export function Podium({ entries }: PodiumProps) {
  if (entries.length === 0) return null;

  // Reorder: [2nd, 1st, 3rd] for visual layout
  const orderedEntries = [entries[1], entries[0], entries[2]].filter(Boolean);

  return (
    <Group justify="center" align="flex-end" gap="md" py="lg">
      {orderedEntries.map((entry, i) => {
        const config = podiumConfig[i];
        if (!entry || !config) return null;
        const initial = entry.userName?.charAt(0)?.toUpperCase() || '?';

        return (
          <motion.div
            key={entry.userId}
            variants={podiumBounceVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: config.position * 0.15 }}
          >
            <Stack align="center" gap="xs">
              <Avatar
                radius="xl"
                size={config.avatarSize}
                style={{ border: `3px solid ${config.color}` }}
              >
                <Text fw={700}>{initial}</Text>
              </Avatar>
              <Text size="sm" fw={600} lineClamp={1} maw={100} ta="center">
                {entry.userName}
              </Text>
              <AnimatedCounter
                value={entry.totalPoints}
                size="sm"
                fw={700}
                c="energy.6"
                suffix=" pts"
              />
              <Box
                style={{
                  width: 80,
                  height: config.height,
                  borderRadius: 'var(--mantine-radius-md) var(--mantine-radius-md) 0 0',
                  backgroundColor: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text size="xl" fw={800} c="white">
                  {config.label}
                </Text>
              </Box>
            </Stack>
          </motion.div>
        );
      })}
    </Group>
  );
}
