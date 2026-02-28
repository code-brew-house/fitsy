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
  Affix,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { IconPlus, IconUsers, IconUserPlus } from '@tabler/icons-react';
import type { DashboardResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { StatCards } from '../../../components/StatCards';
import { FeedItem } from '../../../components/FeedItem';

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
          <IconUsers size={64} color="var(--mantine-color-teal-6)" />
          <Title order={2} ta="center">
            Welcome to Fitsy!
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            You need to be part of a family to start tracking activities and earning points.
          </Text>
          <Group>
            <Button
              variant="filled"
              color="teal"
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push('/create-family')}
            >
              Create a Family
            </Button>
            <Button
              variant="outline"
              color="teal"
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
      <Stack gap="lg">
        <Title order={2}>Dashboard</Title>

        <StatCards
          totalPoints={dashboard.totalPoints}
          pointsThisWeek={dashboard.pointsThisWeek}
          activitiesThisWeek={dashboard.activitiesThisWeek}
          currentStreak={dashboard.currentStreak}
        />

        <Divider />

        <div>
          <Title order={4} mb="sm">
            Recent Activity
          </Title>
          {dashboard.recentActivities.length === 0 ? (
            <Paper p="xl" radius="md" withBorder>
              <Text c="dimmed" ta="center">
                No activities yet. Start logging!
              </Text>
            </Paper>
          ) : (
            <Paper p="md" radius="md" withBorder>
              <Stack gap={0}>
                {dashboard.recentActivities.map((activity) => (
                  <FeedItem key={activity.id} activity={activity} />
                ))}
              </Stack>
            </Paper>
          )}
        </div>
      </Stack>

      <Affix position={{ bottom: 80, right: 20 }}>
        <ActionIcon
          color="teal"
          size="xl"
          radius="xl"
          variant="filled"
          onClick={() => router.push('/log')}
          aria-label="Log activity"
        >
          <IconPlus size={24} />
        </ActionIcon>
      </Affix>
    </Container>
  );
}
