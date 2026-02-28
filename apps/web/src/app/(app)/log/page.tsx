'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Skeleton,
  NumberInput,
  SegmentedControl,
  Button,
  Paper,
  Group,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { MeasurementType, EffortLevel } from '@fitsy/shared';
import type { ActivityTypeResponse, ActivityLogResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { ActivityCard } from '../../../components/ActivityCard';

export default function LogPage() {
  const router = useRouter();
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityTypeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Measurement inputs
  const [distance, setDistance] = useState<number | string>(1);
  const [effort, setEffort] = useState<EffortLevel>(EffortLevel.MEDIUM);
  const [duration, setDuration] = useState<number | string>(10);

  useEffect(() => {
    api
      .get<ActivityTypeResponse[]>('/activity-types')
      .then((data) => setActivityTypes(data.filter((a) => a.isActive)))
      .catch(() => {
        notifications.show({
          title: 'Error',
          message: 'Failed to load activity types',
          color: 'red',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const pointsPreview = useMemo(() => {
    if (!selected) return 0;
    switch (selected.measurementType) {
      case MeasurementType.DISTANCE:
        return Math.round((Number(distance) || 0) * (selected.pointsPerUnit || 0));
      case MeasurementType.EFFORT: {
        const effortMap: Record<EffortLevel, number | null> = {
          [EffortLevel.LOW]: selected.pointsLow,
          [EffortLevel.MEDIUM]: selected.pointsMedium,
          [EffortLevel.HIGH]: selected.pointsHigh,
          [EffortLevel.EXTREME]: selected.pointsExtreme,
        };
        return effortMap[effort] || 0;
      }
      case MeasurementType.FLAT:
        return selected.flatPoints || 0;
      case MeasurementType.DURATION:
        return Math.round((Number(duration) || 0) * (selected.pointsPerMinute || 0));
      default:
        return 0;
    }
  }, [selected, distance, effort, duration]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);

    const body: Record<string, unknown> = { activityTypeId: selected.id };
    switch (selected.measurementType) {
      case MeasurementType.DISTANCE:
        body.distanceKm = Number(distance);
        break;
      case MeasurementType.EFFORT:
        body.effortLevel = effort;
        break;
      case MeasurementType.DURATION:
        body.durationMinutes = Number(duration);
        break;
    }

    try {
      await api.post<ActivityLogResponse>('/activity-logs', body);
      notifications.show({
        title: 'Activity Logged!',
        message: `You earned ${pointsPreview} points`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to log activity',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="lg">
        <Stack gap="md">
          <Skeleton height={30} width={200} />
          <SimpleGrid cols={{ base: 2, md: 3 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} radius="md" />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  // Step 2: Enter measurement
  if (selected) {
    return (
      <Container size="sm">
        <Stack gap="lg">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => setSelected(null)}
            px={0}
          >
            Back
          </Button>

          <Group gap="sm" align="center">
            <Text size="2rem">{selected.icon}</Text>
            <Title order={3}>{selected.name}</Title>
          </Group>

          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              {selected.measurementType === MeasurementType.DISTANCE && (
                <NumberInput
                  label="Distance (km)"
                  value={distance}
                  onChange={setDistance}
                  step={0.1}
                  min={0.1}
                  decimalScale={1}
                  size="lg"
                />
              )}

              {selected.measurementType === MeasurementType.EFFORT && (
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Effort Level
                  </Text>
                  <SegmentedControl
                    value={effort}
                    onChange={(val) => setEffort(val as EffortLevel)}
                    data={[
                      { label: 'Low', value: EffortLevel.LOW },
                      { label: 'Medium', value: EffortLevel.MEDIUM },
                      { label: 'High', value: EffortLevel.HIGH },
                      { label: 'Extreme', value: EffortLevel.EXTREME },
                    ]}
                    fullWidth
                    size="md"
                  />
                </div>
              )}

              {selected.measurementType === MeasurementType.FLAT && (
                <Text c="dimmed" ta="center">
                  Tap submit to log
                </Text>
              )}

              {selected.measurementType === MeasurementType.DURATION && (
                <NumberInput
                  label="Duration (minutes)"
                  value={duration}
                  onChange={setDuration}
                  step={1}
                  min={1}
                  size="lg"
                />
              )}

              <Paper p="md" radius="md" bg="teal.0" ta="center">
                <Text size="sm" c="dimmed">
                  Points you will earn
                </Text>
                <Text size="2rem" fw={700} c="teal">
                  {pointsPreview}
                </Text>
              </Paper>

              <Button
                fullWidth
                size="lg"
                color="teal"
                onClick={handleSubmit}
                loading={submitting}
              >
                Log Activity
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    );
  }

  // Step 1: Select activity type
  return (
    <Container size="lg">
      <Stack gap="lg">
        <Title order={2}>Log Activity</Title>
        <Text c="dimmed">Choose an activity type</Text>

        {activityTypes.length === 0 ? (
          <Paper p="xl" radius="md" withBorder>
            <Text c="dimmed" ta="center">
              No activity types available. Ask an admin to create some.
            </Text>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 2, md: 3 }}>
            {activityTypes.map((at) => (
              <ActivityCard
                key={at.id}
                activity={at}
                selected={false}
                onClick={() => setSelected(at)}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
