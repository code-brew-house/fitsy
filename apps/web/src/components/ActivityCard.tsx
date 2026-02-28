'use client';

import { Paper, Text, Stack } from '@mantine/core';
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
    <Paper
      p="md"
      radius="md"
      withBorder
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--mantine-color-teal-6)' : undefined,
        boxShadow: selected ? '0 0 0 2px var(--mantine-color-teal-3)' : undefined,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
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
  );
}
