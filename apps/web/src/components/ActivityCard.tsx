'use client';

import { Paper, Text, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCheck } from '@tabler/icons-react';
import type { ActivityTypeResponse } from '@fitsy/shared';
import { MeasurementType } from '@fitsy/shared';

interface ActivityCardProps {
  activity: ActivityTypeResponse;
  selected: boolean;
  onClick: () => void;
}

const measurementLabels: Record<MeasurementType, string> = {
  [MeasurementType.DISTANCE]: 'Distance',
  [MeasurementType.EFFORT]: 'Effort',
  [MeasurementType.FLAT]: 'Flat',
  [MeasurementType.DURATION]: 'Duration',
};

export function ActivityCard({ activity, selected, onClick }: ActivityCardProps) {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Paper
        p="lg"
        radius="lg"
        shadow="xs"
        withBorder
        onClick={onClick}
        style={{
          cursor: 'pointer',
          borderColor: selected ? 'var(--mantine-color-indigo-6)' : undefined,
          boxShadow: selected ? '0 0 0 2px var(--mantine-color-indigo-3)' : undefined,
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-indigo-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={14} color="white" />
          </div>
        )}
        <Stack align="center" gap="xs">
          <Text size="2rem">{activity.icon}</Text>
          <Text size="sm" fw={600} ta="center" lineClamp={1}>
            {activity.name}
          </Text>
          <Text size="xs" c="dimmed">
            {measurementLabels[activity.measurementType]}
          </Text>
        </Stack>
      </Paper>
    </motion.div>
  );
}
