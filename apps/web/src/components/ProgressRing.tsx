'use client';

import { motion } from 'framer-motion';
import { Stack, Text } from '@mantine/core';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = 'var(--mantine-color-indigo-6)',
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <Stack align="center" gap={4}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--mantine-color-default-border)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div
        style={{
          marginTop: -size - 4,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
          {value}/{max}
        </Text>
        {label && (
          <Text size="xs" c="dimmed" ta="center">
            {label}
          </Text>
        )}
      </div>
    </Stack>
  );
}
