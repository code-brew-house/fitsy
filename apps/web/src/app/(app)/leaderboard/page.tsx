'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Title,
  Table,
  SegmentedControl,
  Avatar,
  Group,
  Text,
  Center,
  Loader,
  Stack,
  Paper,
  Divider,
} from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { LeaderboardEntry, ActivityLogResponse } from '@fitsy/shared';
import { FeedItem } from '../../../components/FeedItem';

function rankDecoration(rank: number): { borderColor: string; label: string } | null {
  switch (rank) {
    case 1:
      return { borderColor: '#FFD700', label: 'Gold' };
    case 2:
      return { borderColor: '#C0C0C0', label: 'Silver' };
    case 3:
      return { borderColor: '#CD7F32', label: 'Bronze' };
    default:
      return null;
  }
}

function rankDisplay(rank: number): string {
  switch (rank) {
    case 1:
      return '1st';
    case 2:
      return '2nd';
    case 3:
      return '3rd';
    default:
      return `${rank}th`;
  }
}

export default function LeaderboardPage() {
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

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Title order={2}>
          <Group gap="xs">
            <IconTrophy size={28} />
            Leaderboard
          </Group>
        </Title>

        <SegmentedControl
          value={period}
          onChange={setPeriod}
          data={[
            { label: 'This Week', value: 'week' },
            { label: 'This Month', value: 'month' },
            { label: 'All Time', value: 'alltime' },
          ]}
          color="teal"
        />

        {loadingBoard ? (
          <Center py="xl">
            <Loader color="teal" />
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
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={60}>Rank</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th ta="right">Points</Table.Th>
                <Table.Th ta="right">Activities</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((entry, index) => {
                const rank = index + 1;
                const decoration = rankDecoration(rank);
                return (
                  <Table.Tr
                    key={entry.userId}
                    style={
                      decoration
                        ? { borderLeft: `4px solid ${decoration.borderColor}` }
                        : undefined
                    }
                  >
                    <Table.Td fw={700} c={decoration ? undefined : 'dimmed'}>
                      {rankDisplay(rank)}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          src={entry.avatarUrl}
                          color="teal"
                          radius="xl"
                          size="sm"
                        >
                          {entry.userName?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Text fw={500}>{entry.userName}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right" fw={600} c="teal">
                      {entry.totalPoints}
                    </Table.Td>
                    <Table.Td ta="right">{entry.activityCount}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}

        {/* Family Activity Feed */}
        <Divider />
        <Title order={3}>Family Activity Feed</Title>

        {loadingFeed ? (
          <Center py="md">
            <Loader color="teal" size="sm" />
          </Center>
        ) : feed.length === 0 ? (
          <Text c="dimmed">No recent family activity.</Text>
        ) : (
          <Stack gap="xs">
            {feed.map((item) => (
              <Paper key={item.id} p="sm" withBorder radius="sm">
                <FeedItem activity={item} />
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
