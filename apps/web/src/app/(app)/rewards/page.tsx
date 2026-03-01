'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Text,
  Center,
  Loader,
  Stack,
  Modal,
  Group,
  Button,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconGift } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { RewardCard } from '../../../components/RewardCard';
import { Confetti } from '../../../components/Confetti';
import { useHaptics } from '../../../hooks/useHaptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import type { RewardResponse } from '@fitsy/shared';

export default function RewardsPage() {
  const { user } = useAuth();
  const { vibrate } = useHaptics();
  const { play } = useSoundEffect();
  const [rewards, setRewards] = useState<RewardResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<RewardResponse | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchRewards = useCallback(async () => {
    try {
      const res = await api.get<RewardResponse[]>('/rewards');
      setRewards(res);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleRedeemClick = (reward: RewardResponse) => {
    setSelectedReward(reward);
    open();
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;
    setRedeeming(true);
    try {
      await api.post('/redemptions', { rewardId: selectedReward.id });
      notifications.show({
        title: 'Reward Redeemed!',
        message: `You redeemed "${selectedReward.name}" for ${selectedReward.pointCost} points.`,
        color: 'indigo',
      });
      setShowConfetti(true);
      vibrate('achievement');
      play('celebration');
      setTimeout(() => setShowConfetti(false), 2500);
      close();
      await fetchRewards();
    } catch (err) {
      notifications.show({
        title: 'Redemption Failed',
        message: err instanceof Error ? err.message : 'Something went wrong',
        color: 'red',
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Container size="lg">
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <Stack gap="md">
        <Title order={2}>
          <Group gap="xs">
            <IconGift size={28} />
            Rewards
          </Group>
        </Title>

        {loading ? (
          <Center py="xl">
            <Loader color="indigo" />
          </Center>
        ) : rewards.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconGift size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="lg">
                No rewards available yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
            {rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                userPoints={user?.totalPoints ?? 0}
                onRedeem={handleRedeemClick}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Confirmation Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title="Confirm Redemption"
        centered
      >
        {selectedReward && (
          <Stack gap="md">
            <Text>
              Spend{' '}
              <Badge color="indigo" variant="light" component="span">
                {selectedReward.pointCost} points
              </Badge>{' '}
              on <strong>{selectedReward.name}</strong>?
            </Text>
            <Text size="sm" c="dimmed">
              Your balance: {user?.totalPoints ?? 0} points. After redemption:{' '}
              {(user?.totalPoints ?? 0) - selectedReward.pointCost} points.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button
                color="indigo"
                onClick={handleConfirmRedeem}
                loading={redeeming}
              >
                Confirm
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
