'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
  Textarea,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { MeasurementType, EffortLevel } from '@fitsy/shared';
import type { ActivityTypeResponse, ActivityLogResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { ActivityCard } from '../../../components/ActivityCard';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { AnimatedList, AnimatedListItem } from '../../../components/AnimatedList';
import { useHaptics } from '../../../hooks/useHaptics';

export default function LogPage() {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityTypeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const [distance, setDistance] = useState<number | string>(1);
  const [effort, setEffort] = useState<EffortLevel>(EffortLevel.MEDIUM);
  const [duration, setDuration] = useState<number | string>(10);
  const [note, setNote] = useState('');

  useEffect(() => {
    api
      .get<ActivityTypeResponse[]>('/activity-types')
      .then((data) => setActivityTypes(data.filter((a) => a.isActive)))
      .catch(() => {})
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

  const handleCelebrationComplete = useCallback(() => {
    setCelebrating(false);
    router.push('/dashboard');
  }, [router]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    vibrate('tap');

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

    if (note.trim()) {
      body.note = note.trim();
    }

    try {
      await api.post<ActivityLogResponse>('/activity-logs', body);
      setEarnedPoints(pointsPreview);
      setCelebrating(true);
    } catch {
      vibrate('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="lg">
        <Stack gap="md">
          <Skeleton height={30} width={200} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} radius="lg" />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  return (
    <>
      <CelebrationOverlay
        active={celebrating}
        points={earnedPoints}
        onComplete={handleCelebrationComplete}
      />

      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
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

                <Paper p="lg" radius="lg" shadow="xs" withBorder>
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
                          color="indigo"
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

                    <Textarea
                      label="Note (optional)"
                      placeholder="Add a note about your workout..."
                      value={note}
                      onChange={(e) => setNote(e.currentTarget.value)}
                      maxLength={500}
                      autosize
                      minRows={2}
                      maxRows={4}
                    />

                    <Paper p="md" radius="lg" bg="energy.0" ta="center">
                      <Text size="sm" c="dimmed">
                        Points you will earn
                      </Text>
                      <AnimatedCounter
                        value={pointsPreview}
                        size="2rem"
                        fw={800}
                        c="energy.6"
                        duration={0.5}
                      />
                    </Paper>

                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        fullWidth
                        size="lg"
                        color="indigo"
                        onClick={handleSubmit}
                        loading={submitting}
                        leftSection={<IconCheck size={20} />}
                      >
                        Log Activity
                      </Button>
                    </motion.div>
                  </Stack>
                </Paper>
              </Stack>
            </Container>
          </motion.div>
        ) : (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Container size="lg">
              <Stack gap="lg">
                <Title order={2}>Log Activity</Title>
                <Text c="dimmed">Choose an activity type</Text>

                {activityTypes.length === 0 ? (
                  <Paper p="xl" radius="lg" shadow="xs" withBorder>
                    <Text c="dimmed" ta="center">
                      No activity types available. Ask an admin to create some.
                    </Text>
                  </Paper>
                ) : (
                  <AnimatedList>
                    <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }}>
                      {activityTypes.map((at) => (
                        <AnimatedListItem key={at.id}>
                          <ActivityCard
                            activity={at}
                            selected={false}
                            onClick={() => {
                              vibrate('tap');
                              setSelected(at);
                            }}
                          />
                        </AnimatedListItem>
                      ))}
                    </SimpleGrid>
                  </AnimatedList>
                )}
              </Stack>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
