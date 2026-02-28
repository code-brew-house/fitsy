'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Title,
  Table,
  Pagination,
  Select,
  Group,
  Text,
  Center,
  Loader,
  Stack,
} from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { ActivityLogResponse, ActivityTypeResponse } from '@fitsy/shared';
import { MeasurementType } from '@fitsy/shared';

interface PaginatedResponse {
  data: ActivityLogResponse[];
  total: number;
  page: number;
  limit: number;
}

function formatMeasurement(log: ActivityLogResponse): string {
  switch (log.measurementType) {
    case MeasurementType.DISTANCE:
      return log.distanceKm ? `${log.distanceKm} km` : '-';
    case MeasurementType.EFFORT:
      return log.effortLevel
        ? log.effortLevel.charAt(0) + log.effortLevel.slice(1).toLowerCase() + ' effort'
        : '-';
    case MeasurementType.DURATION:
      return log.durationMinutes ? `${log.durationMinutes} min` : '-';
    case MeasurementType.FLAT:
      return 'Completed';
    default:
      return '-';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/activity-logs?page=${page}&limit=${limit}`;
      if (selectedType) {
        url += `&activityTypeId=${selectedType}`;
      }
      const res = await api.get<PaginatedResponse>(url);
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, selectedType]);

  useEffect(() => {
    api
      .get<ActivityTypeResponse[]>('/activity-types')
      .then(setActivityTypes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const typeOptions = activityTypes.map((t) => ({
    value: t.id,
    label: `${t.icon} ${t.name}`,
  }));

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>
            <Group gap="xs">
              <IconHistory size={28} />
              Activity History
            </Group>
          </Title>
          <Select
            placeholder="Filter by activity"
            data={typeOptions}
            value={selectedType}
            onChange={(val) => {
              setSelectedType(val);
              setPage(1);
            }}
            clearable
            w={220}
          />
        </Group>

        {loading ? (
          <Center py="xl">
            <Loader color="teal" />
          </Center>
        ) : logs.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconHistory size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="lg">
                No activities logged yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Activity</Table.Th>
                  <Table.Th>Measurement</Table.Th>
                  <Table.Th ta="right">Points Earned</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{formatDate(log.createdAt)}</Table.Td>
                    <Table.Td>
                      {log.activityTypeIcon} {log.activityTypeName}
                    </Table.Td>
                    <Table.Td>{formatMeasurement(log)}</Table.Td>
                    <Table.Td ta="right" fw={600} c="teal">
                      +{log.pointsEarned}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Center>
                <Pagination
                  total={totalPages}
                  value={page}
                  onChange={setPage}
                  color="teal"
                />
              </Center>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
