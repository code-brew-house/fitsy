'use client';

import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Button,
  Paper,
  Stack,
  SimpleGrid,
} from '@mantine/core';
import { IconUsers, IconUserPlus } from '@tabler/icons-react';

export default function SetupFamilyPage() {
  const router = useRouter();

  return (
    <Container size="sm" mt="xl">
      <Stack align="center" gap="lg">
        <Title order={2} ta="center">
          Get Started
        </Title>
        <Text c="dimmed" ta="center">
          Would you like to create a new family or join an existing one?
        </Text>

        <SimpleGrid cols={2} w="100%" spacing="md">
          <Paper
            p="xl"
            radius="md"
            withBorder
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/create-family')}
          >
            <Stack align="center" gap="md">
              <IconUsers size={40} color="var(--mantine-color-teal-6)" />
              <Title order={4} ta="center">Create a Family</Title>
              <Text size="sm" c="dimmed" ta="center">
                Start a new family group and invite members to join.
              </Text>
              <Button color="teal" fullWidth onClick={() => router.push('/create-family')}>
                Create Family
              </Button>
            </Stack>
          </Paper>

          <Paper
            p="xl"
            radius="md"
            withBorder
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/join-family')}
          >
            <Stack align="center" gap="md">
              <IconUserPlus size={40} color="var(--mantine-color-blue-6)" />
              <Title order={4} ta="center">Join a Family</Title>
              <Text size="sm" c="dimmed" ta="center">
                Enter an invite code to join an existing family.
              </Text>
              <Button color="blue" fullWidth onClick={() => router.push('/join-family')}>
                Join Family
              </Button>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
