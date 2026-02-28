'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  ActionIcon,
  Modal,
  Button,
  NumberInput,
  SegmentedControl,
  Textarea,
  Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconListDetails,
  IconEdit,
  IconTrash,
  IconCheck,
} from '@tabler/icons-react';
import { MeasurementType, EffortLevel } from '@fitsy/shared';
import type { ActivityLogResponse, ActivityTypeResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

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

export default function MyActivitiesPage() {
  const { refreshUser } = useAuth();
  const [logs, setLogs] = useState<ActivityLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const limit = 20;

  // Edit modal state
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editingLog, setEditingLog] = useState<ActivityLogResponse | null>(null);
  const [editDistance, setEditDistance] = useState<number | string>(1);
  const [editEffort, setEditEffort] = useState<EffortLevel>(EffortLevel.MEDIUM);
  const [editDuration, setEditDuration] = useState<number | string>(10);
  const [editNote, setEditNote] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete modal state
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deletingLog, setDeletingLog] = useState<ActivityLogResponse | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  // Find the activity type for the currently editing log
  const editingActivityType = useMemo(() => {
    if (!editingLog) return null;
    return activityTypes.find((t) => t.id === editingLog.activityTypeId) || null;
  }, [editingLog, activityTypes]);

  // Points preview for edit modal
  const editPointsPreview = useMemo(() => {
    if (!editingActivityType) return 0;
    switch (editingActivityType.measurementType) {
      case MeasurementType.DISTANCE:
        return Math.round((Number(editDistance) || 0) * (editingActivityType.pointsPerUnit || 0));
      case MeasurementType.EFFORT: {
        const effortMap: Record<EffortLevel, number | null> = {
          [EffortLevel.LOW]: editingActivityType.pointsLow,
          [EffortLevel.MEDIUM]: editingActivityType.pointsMedium,
          [EffortLevel.HIGH]: editingActivityType.pointsHigh,
          [EffortLevel.EXTREME]: editingActivityType.pointsExtreme,
        };
        return effortMap[editEffort] || 0;
      }
      case MeasurementType.FLAT:
        return editingActivityType.flatPoints || 0;
      case MeasurementType.DURATION:
        return Math.round((Number(editDuration) || 0) * (editingActivityType.pointsPerMinute || 0));
      default:
        return 0;
    }
  }, [editingActivityType, editDistance, editEffort, editDuration]);

  const handleEditOpen = (log: ActivityLogResponse) => {
    setEditingLog(log);
    setEditDistance(log.distanceKm || 1);
    setEditEffort((log.effortLevel as EffortLevel) || EffortLevel.MEDIUM);
    setEditDuration(log.durationMinutes || 10);
    setEditNote(log.note || '');
    openEdit();
  };

  const handleEditSubmit = async () => {
    if (!editingLog || !editingActivityType) return;
    setEditSubmitting(true);

    const body: Record<string, unknown> = {};
    switch (editingActivityType.measurementType) {
      case MeasurementType.DISTANCE:
        body.distanceKm = Number(editDistance);
        break;
      case MeasurementType.EFFORT:
        body.effortLevel = editEffort;
        break;
      case MeasurementType.DURATION:
        body.durationMinutes = Number(editDuration);
        break;
    }

    body.note = editNote.trim() || null;

    try {
      await api.patch<ActivityLogResponse>(`/activity-logs/${editingLog.id}`, body);
      await refreshUser();
      notifications.show({
        title: 'Activity Updated',
        message: `Points updated to ${editPointsPreview}`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      closeEdit();
      fetchLogs();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to update activity',
        color: 'red',
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteOpen = (log: ActivityLogResponse) => {
    setDeletingLog(log);
    openDelete();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLog) return;
    setDeleteSubmitting(true);

    try {
      await api.delete(`/activity-logs/${deletingLog.id}`);
      await refreshUser();
      notifications.show({
        title: 'Activity Deleted',
        message: `${deletingLog.pointsEarned} points have been removed`,
        color: 'orange',
      });
      closeDelete();
      fetchLogs();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete activity',
        color: 'red',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>
            <Group gap="xs">
              <IconListDetails size={28} />
              My Activities
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
              <IconListDetails size={48} color="var(--mantine-color-dimmed)" />
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
                  <Table.Th>Note</Table.Th>
                  <Table.Th ta="right">Points</Table.Th>
                  <Table.Th ta="center">Actions</Table.Th>
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
                    <Table.Td>
                      <Text size="sm" lineClamp={1} maw={200}>
                        {log.note || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right" fw={600} c="teal">
                      +{log.pointsEarned}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleEditOpen(log)}
                          title="Edit"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDeleteOpen(log)}
                          title="Delete"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
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

      {/* Edit Modal */}
      <Modal
        opened={editOpened}
        onClose={closeEdit}
        title={
          editingLog
            ? `Edit: ${editingLog.activityTypeIcon} ${editingLog.activityTypeName}`
            : 'Edit Activity'
        }
        centered
      >
        {editingLog && editingActivityType && (
          <Stack gap="md">
            {editingActivityType.measurementType === MeasurementType.DISTANCE && (
              <NumberInput
                label="Distance (km)"
                value={editDistance}
                onChange={setEditDistance}
                step={0.1}
                min={0.1}
                decimalScale={1}
                size="md"
              />
            )}

            {editingActivityType.measurementType === MeasurementType.EFFORT && (
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Effort Level
                </Text>
                <SegmentedControl
                  value={editEffort}
                  onChange={(val) => setEditEffort(val as EffortLevel)}
                  data={[
                    { label: 'Low', value: EffortLevel.LOW },
                    { label: 'Medium', value: EffortLevel.MEDIUM },
                    { label: 'High', value: EffortLevel.HIGH },
                    { label: 'Extreme', value: EffortLevel.EXTREME },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
            )}

            {editingActivityType.measurementType === MeasurementType.FLAT && (
              <Text c="dimmed" ta="center">
                Flat-rate activity — no measurement to edit
              </Text>
            )}

            {editingActivityType.measurementType === MeasurementType.DURATION && (
              <NumberInput
                label="Duration (minutes)"
                value={editDuration}
                onChange={setEditDuration}
                step={1}
                min={1}
                size="md"
              />
            )}

            <Textarea
              label="Note (optional)"
              placeholder="Add a note about your workout..."
              value={editNote}
              onChange={(e) => setEditNote(e.currentTarget.value)}
              maxLength={500}
              autosize
              minRows={2}
              maxRows={4}
            />

            <Paper p="md" radius="md" bg="teal.0" ta="center">
              <Text size="sm" c="dimmed">
                Points after update
              </Text>
              <Text size="xl" fw={700} c="teal">
                {editPointsPreview}
              </Text>
            </Paper>

            <Group justify="flex-end">
              <Button variant="default" onClick={closeEdit}>
                Cancel
              </Button>
              <Button
                color="teal"
                onClick={handleEditSubmit}
                loading={editSubmitting}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={closeDelete}
        title="Delete Activity"
        centered
      >
        {deletingLog && (
          <Stack gap="md">
            <Text>
              Are you sure you want to delete this activity?
            </Text>
            <Paper p="md" radius="md" bg="red.0" ta="center">
              <Text size="sm" c="dimmed">
                You will lose
              </Text>
              <Text size="xl" fw={700} c="red">
                {deletingLog.pointsEarned} points
              </Text>
            </Paper>
            <Text size="sm" c="dimmed">
              {deletingLog.activityTypeIcon} {deletingLog.activityTypeName} —{' '}
              {formatDate(deletingLog.createdAt)}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDelete}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleDeleteConfirm}
                loading={deleteSubmitting}
              >
                Delete
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
