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
  Textarea,
  NumberInput,
  Stack,
  ActionIcon,
  Text,
  Center,
  Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import type { RewardResponse } from '@fitsy/shared';
import { api } from '../../../../lib/api';

interface FormState {
  name: string;
  description: string;
  imageUrl: string;
  pointCost: number | string;
  quantity: number | string;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  imageUrl: '',
  pointCost: '',
  quantity: '',
};

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<RewardResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchRewards = useCallback(async () => {
    try {
      const data = await api.get<RewardResponse[]>('/rewards?includeInactive=true');
      setRewards(data);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load rewards', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    open();
  };

  const openEdit = (reward: RewardResponse) => {
    setEditingId(reward.id);
    setForm({
      name: reward.name,
      description: reward.description,
      imageUrl: reward.imageUrl ?? '',
      pointCost: reward.pointCost,
      quantity: reward.quantity ?? '',
    });
    open();
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.pointCost) {
      notifications.show({ title: 'Validation', message: 'Name, description, and point cost are required', color: 'orange' });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        pointCost: Number(form.pointCost),
      };
      if (form.imageUrl) body.imageUrl = form.imageUrl;
      if (form.quantity !== '' && form.quantity !== undefined) body.quantity = Number(form.quantity);

      if (editingId) {
        await api.patch(`/rewards/${editingId}`, body);
        notifications.show({ title: 'Updated', message: 'Reward updated', color: 'indigo' });
      } else {
        await api.post('/rewards', body);
        notifications.show({ title: 'Created', message: 'Reward created', color: 'indigo' });
      }
      close();
      await fetchRewards();
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
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/rewards/${id}`);
      notifications.show({ title: 'Deleted', message: `"${name}" deleted`, color: 'indigo' });
      await fetchRewards();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete',
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
          <Title order={2}>Manage Rewards</Title>
          <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={openAdd}>
            Add Reward
          </Button>
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Point Cost</Table.Th>
              <Table.Th>Quantity</Table.Th>
              <Table.Th>Active</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rewards.map((r) => (
              <Table.Tr key={r.id} style={{ opacity: r.isActive ? 1 : 0.5 }}>
                <Table.Td>{r.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={1}>{r.description}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="indigo" variant="light">{r.pointCost}</Badge>
                </Table.Td>
                <Table.Td>{r.quantity ?? 'Unlimited'}</Table.Td>
                <Table.Td>
                  <Badge color={r.isActive ? 'teal' : 'gray'}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(r)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(r.id, r.name)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {rewards.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="md">No rewards found</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Stack>

      <Modal opened={opened} onClose={close} title={editingId ? 'Edit Reward' : 'Add Reward'} centered>
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="e.g. Movie Night"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
            required
          />
          <Textarea
            label="Description"
            placeholder="Describe the reward..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.currentTarget.value }))}
            required
            minRows={3}
          />
          <TextInput
            label="Image URL"
            placeholder="https://example.com/image.png (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.currentTarget.value }))}
          />
          <NumberInput
            label="Point Cost"
            value={form.pointCost}
            onChange={(val) => setForm((f) => ({ ...f, pointCost: val }))}
            min={1}
            required
          />
          <NumberInput
            label="Quantity"
            placeholder="Leave empty for unlimited"
            value={form.quantity}
            onChange={(val) => setForm((f) => ({ ...f, quantity: val }))}
            min={1}
          />
          <Button color="indigo" onClick={handleSubmit} loading={saving} fullWidth mt="sm">
            {editingId ? 'Update' : 'Create'}
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
