'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Select,
  Group,
  Paper,
  Text,
  Center,
  Loader,
  Pagination,
  Modal,
  SegmentedControl,
  Button,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconMoodEmpty } from '@tabler/icons-react';
import type { ActivityLogResponse, ActivityTypeResponse, ProfileResponse } from '@fitsy/shared';
import { api } from '../lib/api';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats } from './ProfileStats';
import { FeedItem } from './FeedItem';

interface ProfileViewProps {
  userId: string;
  isOwnProfile: boolean;
}

interface PaginatedResponse {
  data: ActivityLogResponse[];
  total: number;
  page: number;
  limit: number;
}

export function ProfileView({ userId, isOwnProfile }: ProfileViewProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [activities, setActivities] = useState<ActivityLogResponse[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Fetch profile data
  useEffect(() => {
    setLoadingProfile(true);
    setError(null);
    api
      .get<ProfileResponse>(`/users/${userId}/profile`)
      .then(setProfile)
      .catch((err) => {
        if ((err as any)?.status === 403) {
          setError('You can only view profiles of club members');
        } else {
          setError('Member not found');
        }
      })
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  // Fetch activity types for filter
  useEffect(() => {
    api
      .get<ActivityTypeResponse[]>('/activity-types')
      .then(setActivityTypes)
      .catch(() => {});
  }, []);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      let url = `/activity-logs?userId=${userId}&page=${page}&limit=${limit}`;
      if (selectedType) {
        url += `&activityTypeId=${selectedType}`;
      }
      const res = await api.get<PaginatedResponse>(url);
      setActivities(res.data);
      setTotal(res.total);
    } catch {
      setActivities([]);
      setTotal(0);
    } finally {
      setLoadingActivities(false);
    }
  }, [userId, page, selectedType]);

  useEffect(() => {
    if (!error) {
      fetchActivities();
    }
  }, [fetchActivities, error]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedType]);

  if (loadingProfile) {
    return (
      <Center py="xl">
        <Loader color="indigo" />
      </Center>
    );
  }

  if (error || !profile) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <IconMoodEmpty size={48} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="lg">{error || 'Member not found'}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <>
      <Stack gap="lg">
        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          onSettingsClick={openSettings}
        />

        <ProfileStats profile={profile} />

        {/* Activity filter */}
        <Group>
          <Select
            placeholder="All activity types"
            data={activityTypes.map((t) => ({ value: t.id, label: `${t.icon} ${t.name}` }))}
            value={selectedType}
            onChange={setSelectedType}
            clearable
            w={250}
          />
        </Group>

        {/* Activity feed */}
        {loadingActivities ? (
          <Center py="md">
            <Loader color="indigo" size="sm" />
          </Center>
        ) : activities.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconMoodEmpty size={36} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">No activities logged yet</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {activities.map((item) => (
              <Paper key={item.id} p="sm" withBorder radius="sm">
                <FeedItem activity={item} />
              </Paper>
            ))}
          </Stack>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Center>
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              color="indigo"
            />
          </Center>
        )}
      </Stack>

      {/* Settings modal (own profile only) */}
      {isOwnProfile && (
        <Modal opened={settingsOpened} onClose={closeSettings} title="Preferences" centered>
          <Stack gap="md">
            <Text size="sm" fw={500}>Color Scheme</Text>
            <SegmentedControl
              value={colorScheme}
              onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
              data={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'Auto', value: 'auto' },
              ]}
              color="indigo"
            />
            <Group justify="flex-end">
              <Button
                color="indigo"
                onClick={() => {
                  notifications.show({
                    title: 'Preferences Saved',
                    message: 'Your color scheme preference has been updated.',
                    color: 'indigo',
                  });
                  closeSettings();
                }}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </>
  );
}
