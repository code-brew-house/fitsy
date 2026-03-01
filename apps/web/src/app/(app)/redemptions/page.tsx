'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Table,
  Badge,
  Text,
  Center,
  Loader,
  Stack,
  Group,
} from '@mantine/core';
import { IconReceipt } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { RedemptionResponse } from '@fitsy/shared';
import { RedemptionStatus } from '@fitsy/shared';

function statusColor(status: RedemptionStatus): string {
  switch (status) {
    case RedemptionStatus.PENDING:
      return 'yellow';
    case RedemptionStatus.FULFILLED:
      return 'green';
    case RedemptionStatus.CANCELLED:
      return 'red';
    default:
      return 'gray';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RedemptionsPage() {
  const [redemptions, setRedemptions] = useState<RedemptionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<RedemptionResponse[]>('/redemptions')
      .then(setRedemptions)
      .catch(() => setRedemptions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container size="lg">
      <Stack gap="md">
        <Title order={2}>
          <Group gap="xs">
            <IconReceipt size={28} />
            My Redemptions
          </Group>
        </Title>

        {loading ? (
          <Center py="xl">
            <Loader color="indigo" />
          </Center>
        ) : redemptions.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconReceipt size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="lg">
                No redemptions yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reward</Table.Th>
                <Table.Th ta="right">Points Spent</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {redemptions.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td fw={500}>{r.rewardName}</Table.Td>
                  <Table.Td ta="right">{r.pointsSpent}</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor(r.status)} variant="light">
                      {r.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatDate(r.createdAt)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  );
}
