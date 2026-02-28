'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Title,
  Table,
  Button,
  Group,
  Badge,
  Stack,
  Text,
  Center,
  Loader,
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { RedemptionStatus } from '@fitsy/shared';
import type { RedemptionResponse } from '@fitsy/shared';
import { api } from '../../../../lib/api';

const statusColors: Record<RedemptionStatus, string> = {
  [RedemptionStatus.PENDING]: 'yellow',
  [RedemptionStatus.FULFILLED]: 'teal',
  [RedemptionStatus.CANCELLED]: 'red',
};

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<RedemptionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const fetchRedemptions = useCallback(async () => {
    try {
      const data = await api.get<RedemptionResponse[]>('/redemptions/all');
      setRedemptions(data);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load redemptions', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  const handleFulfill = async (id: string) => {
    setFulfillingId(id);
    try {
      await api.patch(`/redemptions/${id}/fulfill`, {});
      notifications.show({ title: 'Fulfilled', message: 'Redemption marked as fulfilled', color: 'teal' });
      await fetchRedemptions();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to fulfill',
        color: 'red',
      });
    } finally {
      setFulfillingId(null);
    }
  };

  const filtered = filter
    ? redemptions.filter((r) => r.status === filter)
    : redemptions;

  if (loading) {
    return (
      <Container size="lg">
        <Center py="xl"><Loader color="teal" /></Center>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Family Redemptions</Title>
          <Select
            placeholder="Filter by status"
            clearable
            data={[
              { value: RedemptionStatus.PENDING, label: 'Pending' },
              { value: RedemptionStatus.FULFILLED, label: 'Fulfilled' },
              { value: RedemptionStatus.CANCELLED, label: 'Cancelled' },
            ]}
            value={filter}
            onChange={setFilter}
            w={180}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Member</Table.Th>
              <Table.Th>Reward</Table.Th>
              <Table.Th>Points Spent</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.userName}</Table.Td>
                <Table.Td>{r.rewardName}</Table.Td>
                <Table.Td>
                  <Badge color="teal" variant="light">{r.pointsSpent}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={statusColors[r.status]}>{r.status}</Badge>
                </Table.Td>
                <Table.Td>{new Date(r.createdAt).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  {r.status === RedemptionStatus.PENDING && (
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconCheck size={14} />}
                      loading={fulfillingId === r.id}
                      onClick={() => handleFulfill(r.id)}
                    >
                      Fulfill
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="md">No redemptions found</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Stack>
    </Container>
  );
}
