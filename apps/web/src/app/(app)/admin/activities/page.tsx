'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Title,
  Table,
  Button,
  Group,
  Badge,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Stack,
  ActionIcon,
  Text,
  Center,
  Loader,
  Paper,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconToggleLeft, IconToggleRight } from '@tabler/icons-react';
import { MeasurementType } from '@fitsy/shared';
import type { ActivityTypeResponse } from '@fitsy/shared';
import { api } from '../../../../lib/api';

interface FormState {
  name: string;
  icon: string;
  measurementType: MeasurementType;
  pointsPerUnit: number | string;
  pointsLow: number | string;
  pointsMedium: number | string;
  pointsHigh: number | string;
  pointsExtreme: number | string;
  flatPoints: number | string;
  pointsPerMinute: number | string;
}

const emptyForm: FormState = {
  name: '',
  icon: '',
  measurementType: MeasurementType.DISTANCE,
  pointsPerUnit: '',
  pointsLow: '',
  pointsMedium: '',
  pointsHigh: '',
  pointsExtreme: '',
  flatPoints: '',
  pointsPerMinute: '',
};

function formatPointsConfig(at: ActivityTypeResponse): string {
  switch (at.measurementType) {
    case MeasurementType.DISTANCE:
      return `${at.pointsPerUnit ?? 0} pts/km`;
    case MeasurementType.EFFORT:
      return `L:${at.pointsLow ?? 0} M:${at.pointsMedium ?? 0} H:${at.pointsHigh ?? 0} X:${at.pointsExtreme ?? 0}`;
    case MeasurementType.FLAT:
      return `${at.flatPoints ?? 0} pts/session`;
    case MeasurementType.DURATION:
      return `${at.pointsPerMinute ?? 0} pts/min`;
    default:
      return '-';
  }
}

export default function AdminActivitiesPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activities, setActivities] = useState<ActivityTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await api.get<ActivityTypeResponse[]>('/activity-types?includeInactive=true');
      setActivities(data);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load activity types', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    open();
  };

  const openEdit = (at: ActivityTypeResponse) => {
    setEditingId(at.id);
    setForm({
      name: at.name,
      icon: at.icon,
      measurementType: at.measurementType,
      pointsPerUnit: at.pointsPerUnit ?? '',
      pointsLow: at.pointsLow ?? '',
      pointsMedium: at.pointsMedium ?? '',
      pointsHigh: at.pointsHigh ?? '',
      pointsExtreme: at.pointsExtreme ?? '',
      flatPoints: at.flatPoints ?? '',
      pointsPerMinute: at.pointsPerMinute ?? '',
    });
    open();
  };

  const buildBody = () => {
    const body: Record<string, unknown> = {
      name: form.name,
      icon: form.icon,
      measurementType: form.measurementType,
    };
    switch (form.measurementType) {
      case MeasurementType.DISTANCE:
        body.pointsPerUnit = Number(form.pointsPerUnit) || undefined;
        body.unit = 'km';
        break;
      case MeasurementType.EFFORT:
        body.pointsLow = Number(form.pointsLow) || undefined;
        body.pointsMedium = Number(form.pointsMedium) || undefined;
        body.pointsHigh = Number(form.pointsHigh) || undefined;
        body.pointsExtreme = Number(form.pointsExtreme) || undefined;
        break;
      case MeasurementType.FLAT:
        body.flatPoints = Number(form.flatPoints) || undefined;
        break;
      case MeasurementType.DURATION:
        body.pointsPerMinute = Number(form.pointsPerMinute) || undefined;
        break;
    }
    return body;
  };

  const handleSubmit = async () => {
    if (!form.name || !form.icon) {
      notifications.show({ title: 'Validation', message: 'Name and icon are required', color: 'orange' });
      return;
    }
    setSaving(true);
    try {
      const body = buildBody();
      if (editingId) {
        await api.patch(`/activity-types/${editingId}`, body);
        notifications.show({ title: 'Updated', message: 'Activity type updated', color: 'indigo' });
      } else {
        await api.post('/activity-types', body);
        notifications.show({ title: 'Created', message: 'Activity type created', color: 'indigo' });
      }
      close();
      await fetchActivities();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/activity-types/${id}`);
      notifications.show({ title: 'Deleted', message: `"${name}" deleted`, color: 'indigo' });
      await fetchActivities();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete',
        color: 'red',
      });
    }
  };

  const handleToggleActive = async (at: ActivityTypeResponse) => {
    try {
      await api.patch(`/activity-types/${at.id}`, { isActive: !at.isActive });
      await fetchActivities();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to toggle',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Container size="lg">
        <Center py="xl"><Loader color="indigo" /></Center>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Manage Activity Types</Title>
          <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={openAdd}>
            Add Activity
          </Button>
        </Group>

        {isMobile ? (
          <Stack gap="sm">
            {activities.length === 0 && (
              <Text c="dimmed" ta="center" py="md">No activity types found</Text>
            )}
            {activities.map((at) => (
              <Paper key={at.id} p="md" radius="md" withBorder style={{ opacity: at.isActive ? 1 : 0.5 }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xl">{at.icon}</Text>
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600}>{at.name}</Text>
                      <Group gap="xs">
                        <Badge variant="light" color="blue" size="sm">{at.measurementType}</Badge>
                        <Badge color={at.isActive ? 'teal' : 'gray'} size="sm">
                          {at.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">{formatPointsConfig(at)}</Text>
                    </Stack>
                  </Group>
                  <Group gap="xs" style={{ flexShrink: 0 }}>
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(at)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color={at.isActive ? 'orange' : 'teal'} onClick={() => handleToggleActive(at)}>
                      {at.isActive ? <IconToggleRight size={16} /> : <IconToggleLeft size={16} />}
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(at.id, at.name)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Icon</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Points Config</Table.Th>
                <Table.Th>Active</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activities.map((at) => (
                <Table.Tr key={at.id} style={{ opacity: at.isActive ? 1 : 0.5 }}>
                  <Table.Td><Text size="xl">{at.icon}</Text></Table.Td>
                  <Table.Td>{at.name}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue">{at.measurementType}</Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm">{formatPointsConfig(at)}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={at.isActive ? 'teal' : 'gray'}>
                      {at.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(at)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color={at.isActive ? 'orange' : 'teal'} onClick={() => handleToggleActive(at)}>
                        {at.isActive ? <IconToggleRight size={16} /> : <IconToggleLeft size={16} />}
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(at.id, at.name)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {activities.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="md">No activity types found</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title={editingId ? 'Edit Activity Type' : 'Add Activity Type'} centered>
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="e.g. Running"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
            required
          />
          <TextInput
            label="Icon"
            placeholder="e.g. \ud83c\udfc3"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.currentTarget.value }))}
            required
          />
          <Select
            label="Measurement Type"
            data={Object.values(MeasurementType).map((v) => ({ value: v, label: v }))}
            value={form.measurementType}
            onChange={(val) => setForm((f) => ({ ...f, measurementType: (val as MeasurementType) || MeasurementType.DISTANCE }))}
          />

          {form.measurementType === MeasurementType.DISTANCE && (
            <NumberInput
              label="Points per km"
              value={form.pointsPerUnit}
              onChange={(val) => setForm((f) => ({ ...f, pointsPerUnit: val }))}
              min={0}
              step={1}
            />
          )}

          {form.measurementType === MeasurementType.EFFORT && (
            <>
              <NumberInput
                label="Points Low"
                value={form.pointsLow}
                onChange={(val) => setForm((f) => ({ ...f, pointsLow: val }))}
                min={0}
              />
              <NumberInput
                label="Points Medium"
                value={form.pointsMedium}
                onChange={(val) => setForm((f) => ({ ...f, pointsMedium: val }))}
                min={0}
              />
              <NumberInput
                label="Points High"
                value={form.pointsHigh}
                onChange={(val) => setForm((f) => ({ ...f, pointsHigh: val }))}
                min={0}
              />
              <NumberInput
                label="Points Extreme"
                value={form.pointsExtreme}
                onChange={(val) => setForm((f) => ({ ...f, pointsExtreme: val }))}
                min={0}
              />
            </>
          )}

          {form.measurementType === MeasurementType.FLAT && (
            <NumberInput
              label="Points per session"
              value={form.flatPoints}
              onChange={(val) => setForm((f) => ({ ...f, flatPoints: val }))}
              min={0}
            />
          )}

          {form.measurementType === MeasurementType.DURATION && (
            <NumberInput
              label="Points per minute"
              value={form.pointsPerMinute}
              onChange={(val) => setForm((f) => ({ ...f, pointsPerMinute: val }))}
              min={0}
              step={0.1}
              decimalScale={1}
            />
          )}

          <Button color="indigo" onClick={handleSubmit} loading={saving} fullWidth mt="sm">
            {editingId ? 'Update' : 'Create'}
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
