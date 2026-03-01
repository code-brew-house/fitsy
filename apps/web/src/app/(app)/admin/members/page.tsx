'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Container,
  Title,
  Table,
  Button,
  Group,
  Badge,
  Stack,
  ActionIcon,
  Text,
  Center,
  Loader,
  Paper,
  TextInput,
  CopyButton,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconCheck, IconRefresh, IconTrash } from '@tabler/icons-react';
import { Role } from '@fitsy/shared';
import type { FamilyResponse, UserResponse } from '@fitsy/shared';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

interface MemberResponse extends UserResponse {
  createdAt: string;
}

export default function AdminMembersPage() {
  const { user: currentUser } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [family, setFamily] = useState<FamilyResponse | null>(null);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [familyData, membersData] = await Promise.all([
        api.get<FamilyResponse>('/family'),
        api.get<MemberResponse[]>('/family/members'),
      ]);
      setFamily(familyData);
      setMembers(membersData);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load family data', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate invite code? The old code will stop working.')) return;
    setRegenerating(true);
    try {
      const data = await api.post<FamilyResponse>('/family/regenerate-code', {});
      setFamily(data);
      notifications.show({ title: 'Success', message: 'Invite code regenerated', color: 'teal' });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to regenerate code',
        color: 'red',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove "${memberName}" from the family?`)) return;
    try {
      await api.delete(`/family/members/${memberId}`);
      notifications.show({ title: 'Removed', message: `${memberName} has been removed`, color: 'teal' });
      await fetchData();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to remove member',
        color: 'red',
      });
    }
  };

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
        <Title order={2}>Family Members</Title>

        {family && (
          <Paper p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={500}>Invite Code</Text>
              <Group>
                <TextInput
                  value={family.inviteCode}
                  readOnly
                  style={{ flex: 1 }}
                  styles={{ input: { fontFamily: 'monospace', letterSpacing: '0.1em' } }}
                />
                <CopyButton value={family.inviteCode} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy} size="lg">
                        {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRegenerate}
                  loading={regenerating}
                  size="sm"
                >
                  Regenerate
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {isMobile ? (
          <Stack gap="sm">
            {members.length === 0 && (
              <Text c="dimmed" ta="center" py="md">No members found</Text>
            )}
            {members.map((m) => (
              <Paper key={m.id} p="md" radius="md" withBorder>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={600}>{m.name}</Text>
                      <Badge color={m.role === Role.ADMIN ? 'blue' : 'gray'} size="sm">{m.role}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</Text>
                    <Group gap="xs">
                      <Text size="sm">{m.totalPoints} pts</Text>
                      <Text size="xs" c="dimmed">· Joined {new Date(m.createdAt).toLocaleDateString()}</Text>
                    </Group>
                  </Stack>
                  {m.role !== Role.ADMIN && m.id !== currentUser?.id && (
                    <ActionIcon variant="subtle" color="red" onClick={() => handleRemoveMember(m.id, m.name)} style={{ flexShrink: 0 }}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Points</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((m) => (
                <Table.Tr key={m.id}>
                  <Table.Td>{m.name}</Table.Td>
                  <Table.Td>{m.email}</Table.Td>
                  <Table.Td>
                    <Badge color={m.role === Role.ADMIN ? 'blue' : 'gray'}>
                      {m.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{m.totalPoints}</Table.Td>
                  <Table.Td>{new Date(m.createdAt).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    {m.role !== Role.ADMIN && m.id !== currentUser?.id && (
                      <ActionIcon variant="subtle" color="red" onClick={() => handleRemoveMember(m.id, m.name)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {members.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="md">No members found</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  );
}
