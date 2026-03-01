'use client';

import {
  Card,
  Text,
  Badge,
  Button,
  Group,
  Box,
  Tooltip,
} from '@mantine/core';
import { IconGift } from '@tabler/icons-react';
import type { RewardResponse } from '@fitsy/shared';

interface RewardCardProps {
  reward: RewardResponse;
  userPoints: number;
  onRedeem: (reward: RewardResponse) => void;
}

export function RewardCard({ reward, userPoints, onRedeem }: RewardCardProps) {
  const canAfford = userPoints >= reward.pointCost;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      {/* Image placeholder */}
      {reward.imageUrl ? (
        <Card.Section>
          <Box
            component="img"
            src={reward.imageUrl}
            alt={reward.name}
            h={160}
            w="100%"
            style={{ objectFit: 'cover' }}
          />
        </Card.Section>
      ) : (
        <Card.Section>
          <Box
            h={160}
            style={{
              background: 'var(--mantine-color-indigo-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconGift size={48} color="white" />
          </Box>
        </Card.Section>
      )}

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} lineClamp={1}>
          {reward.name}
        </Text>
        <Badge color="energy" variant="light">
          {reward.pointCost} pts
        </Badge>
      </Group>

      <Text size="sm" c="dimmed" lineClamp={2} mb="md">
        {reward.description}
      </Text>

      {canAfford ? (
        <Button
          color="indigo"
          fullWidth
          radius="md"
          onClick={() => onRedeem(reward)}
        >
          Redeem
        </Button>
      ) : (
        <Tooltip label="Not enough points">
          <Button
            color="indigo"
            fullWidth
            radius="md"
            disabled
            data-disabled
            styles={{ root: { pointerEvents: 'all' } }}
          >
            Redeem
          </Button>
        </Tooltip>
      )}
    </Card>
  );
}
