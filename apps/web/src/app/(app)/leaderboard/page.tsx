'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Container,
  Title,
  Text,
  Center,
  Loader,
  Stack,
  Paper,
  Group,
  Box,
  UnstyledButton,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { IconTrophy } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { LeaderboardEntry, ActivityLogResponse } from '@fitsy/shared';
import { useAuth } from '../../../lib/auth-context';
import { FeedItem } from '../../../components/FeedItem';
import { UserLink } from '../../../components/UserLink';
import { Podium } from '../../../components/Podium';
import { AnimatedList, AnimatedListItem } from '../../../components/AnimatedList';
import { AnimatedCounter } from '../../../components/AnimatedCounter';

const periods = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'alltime' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('week');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [feed, setFeed] = useState<ActivityLogResponse[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingBoard(true);
    try {
      const res = await api.get<LeaderboardEntry[]>(`/leaderboard?period=${period}`);
      setEntries(res);
    } catch {
      setEntries([]);
    } finally {
      setLoadingBoard(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    api
      .get<ActivityLogResponse[]>('/activity-logs/feed?limit=10')
      .then(setFeed)
      .catch(() => setFeed([]))
      .finally(() => setLoadingFeed(false));
  }, []);

  const activeIndex = periods.findIndex((p) => p.value === period);

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Title order={2}>
          <Group gap="xs">
            <IconTrophy size={28} color="var(--mantine-color-sunshine-6)" />
            Leaderboard
          </Group>
        </Title>

        <Box
          style={{
            display: 'flex',
            position: 'relative',
            backgroundColor: 'var(--mantine-color-default)',
            borderRadius: 'var(--mantine-radius-xl)',
            padding: 4,
            border: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <motion.div
            layoutId="periodIndicator"
            style={{
              position: 'absolute',
              top: 4,
              height: 'calc(100% - 8px)',
              width: `calc(${100 / periods.length}% - 4px)`,
              left: `calc(${(activeIndex * 100) / periods.length}% + 2px)`,
              backgroundColor: 'var(--mantine-color-indigo-6)',
              borderRadius: 'var(--mantine-radius-xl)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
          {periods.map((p) => (
            <UnstyledButton
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 0',
                position: 'relative',
                zIndex: 1,
                borderRadius: 'var(--mantine-radius-xl)',
              }}
            >
              <Text
                size="sm"
                fw={period === p.value ? 700 : 500}
                c={period === p.value ? 'white' : 'dimmed'}
              >
                {p.label}
              </Text>
            </UnstyledButton>
          ))}
        </Box>

        {loadingBoard ? (
          <Center py="xl">
            <Loader color="indigo" />
          </Center>
        ) : entries.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconTrophy size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="lg">
                No rankings yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <>
            {entries.length >= 2 && (
              <Podium
                entries={entries.slice(0, 3).map((e) => ({
                  userId: e.userId,
                  userName: e.userName,
                  avatarUrl: e.avatarUrl,
                  totalPoints: e.totalPoints,
                }))}
              />
            )}

            {entries.length > 3 && (
              <AnimatedList>
                <Stack gap="xs">
                  {entries.slice(3).map((entry, index) => {
                    const rank = index + 4;
                    const isCurrentUser = entry.userId === user?.id;
                    return (
                      <AnimatedListItem key={entry.userId}>
                        <Paper
                          p="md"
                          radius="lg"
                          shadow="xs"
                          withBorder
                          style={
                            isCurrentUser
                              ? { borderColor: 'var(--mantine-color-indigo-6)', backgroundColor: 'var(--mantine-color-indigo-0)' }
                              : undefined
                          }
                        >
                          <Group justify="space-between" align="center">
                            <Group gap="sm">
                              <Text fw={700} w={32} c="dimmed">
                                {rank}th
                              </Text>
                              <UserLink userId={entry.userId} name={entry.userName} avatarUrl={entry.avatarUrl} showAvatar fw={500} />
                              {isCurrentUser && (
                                <Text size="xs" fw={700} c="indigo">You</Text>
                              )}
                            </Group>
                            <Stack align="flex-end" gap={0}>
                              <AnimatedCounter value={entry.totalPoints} fw={600} c="energy.6" size="sm" suffix=" pts" />
                              <Text size="xs" c="dimmed">{entry.activityCount} activities</Text>
                            </Stack>
                          </Group>
                        </Paper>
                      </AnimatedListItem>
                    );
                  })}
                </Stack>
              </AnimatedList>
            )}
          </>
        )}

        <Title order={3} mt="md">Club Activity Feed</Title>

        {loadingFeed ? (
          <Center py="md">
            <Loader color="indigo" size="sm" />
          </Center>
        ) : feed.length === 0 ? (
          <Text c="dimmed">No recent club activity.</Text>
        ) : (
          <AnimatedList>
            <Stack gap="xs">
              {feed.map((item) => (
                <AnimatedListItem key={item.id}>
                  <Paper p="sm" withBorder radius="lg" shadow="xs">
                    <FeedItem activity={item} />
                  </Paper>
                </AnimatedListItem>
              ))}
            </Stack>
          </AnimatedList>
        )}
      </Stack>
    </Container>
  );
}
