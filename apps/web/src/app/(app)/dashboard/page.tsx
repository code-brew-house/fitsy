'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Skeleton,
  Stack,
  Paper,
  Button,
  Group,
  Box,
  Affix,
  ActionIcon,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { IconPlus, IconUsers, IconUserPlus, IconFlame } from '@tabler/icons-react';
import type { DashboardResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { StatCards } from '../../../components/StatCards';
import { FeedItem } from '../../../components/FeedItem';
import { ProgressRing } from '../../../components/ProgressRing';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { AnimatedList, AnimatedListItem } from '../../../components/AnimatedList';
import { STREAK_FLAME_KEYFRAMES } from '../../../lib/motion';

function getStreakColor(streak: number): string {
  if (streak >= 7) return 'var(--mantine-color-indigo-6)';
  if (streak >= 4) return 'var(--mantine-color-coral-6)';
  return 'var(--mantine-color-energy-6)';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (!user.familyId) {
      setLoading(false);
      return;
    }

    api
      .get<DashboardResponse>('/dashboard')
      .then(setDashboard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <Container size="lg">
        <Stack gap="md">
          <Skeleton height={30} width={200} />
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={200} />
        </Stack>
      </Container>
    );
  }

  if (!user?.familyId) {
    return (
      <Container size="sm">
        <Stack align="center" gap="lg" mt="xl">
          <IconUsers size={64} color="var(--mantine-color-indigo-6)" />
          <Title order={2} ta="center">
            Welcome to Fitsy!
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            You need to be part of a family to start tracking activities and earning points.
          </Text>
          <Group>
            <Button
              variant="filled"
              color="indigo"
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push('/create-family')}
            >
              Create a Family
            </Button>
            <Button
              variant="outline"
              color="indigo"
              leftSection={<IconUserPlus size={16} />}
              onClick={() => router.push('/join-family')}
            >
              Join a Family
            </Button>
          </Group>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg">
        <Text c="red">Error loading dashboard: {error}</Text>
      </Container>
    );
  }

  if (!dashboard) return null;

  return (
    <Container size="lg">
      <style>{STREAK_FLAME_KEYFRAMES}</style>

      <Stack gap="lg">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="sm" align="center">
                <Title order={2}>
                  Hey {user?.name?.split(' ')[0]}!
                </Title>
                {dashboard.currentStreak > 0 && (
                  <Group gap={4}>
                    <IconFlame
                      size={24}
                      color={getStreakColor(dashboard.currentStreak)}
                      style={{
                        animation: 'flameWobble 2s ease-in-out infinite',
                      }}
                    />
                    <Text fw={700} c={dashboard.currentStreak >= 7 ? 'indigo' : dashboard.currentStreak >= 4 ? 'coral' : 'energy'}>
                      {dashboard.currentStreak}d streak
                    </Text>
                  </Group>
                )}
              </Group>
              <AnimatedCounter
                value={dashboard.totalPoints}
                size="2rem"
                fw={800}
                c="energy.6"
                suffix=" pts"
                duration={1.2}
              />
            </Box>
            <ProgressRing
              value={dashboard.activitiesThisWeek}
              max={7}
              size={100}
              label="this week"
            />
          </Group>
        </motion.div>

        <StatCards
          totalPoints={dashboard.totalPoints}
          pointsThisWeek={dashboard.pointsThisWeek}
          activitiesThisWeek={dashboard.activitiesThisWeek}
          currentStreak={dashboard.currentStreak}
        />

        <div>
          <Title order={4} mb="sm">
            Recent Activity
          </Title>
          {dashboard.recentActivities.length === 0 ? (
            <Paper p="xl" radius="lg" shadow="xs" withBorder>
              <Text c="dimmed" ta="center">
                No activities yet. Start logging!
              </Text>
            </Paper>
          ) : (
            <AnimatedList>
              <Stack gap="xs">
                {dashboard.recentActivities.map((activity) => (
                  <AnimatedListItem key={activity.id}>
                    <Paper p="md" radius="lg" shadow="xs" withBorder>
                      <FeedItem activity={activity} />
                    </Paper>
                  </AnimatedListItem>
                ))}
              </Stack>
            </AnimatedList>
          )}
        </div>
      </Stack>

      <Affix position={{ bottom: 90, right: 20 }}>
        <motion.div whileTap={{ scale: 0.9 }}>
          <ActionIcon
            color="indigo"
            size={56}
            radius="xl"
            variant="filled"
            onClick={() => router.push('/log')}
            aria-label="Log activity"
            style={{
              boxShadow: '0 4px 16px rgba(108, 92, 231, 0.4)',
            }}
          >
            <IconPlus size={28} />
          </ActionIcon>
        </motion.div>
      </Affix>
    </Container>
  );
}
