'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { signUp } from '../../../../lib/auth-client';
import { api } from '../../../../lib/api';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      inviteCode: params.code || '',
    },
    validate: {
      name: (v) => (v.trim().length > 0 ? null : 'Name is required'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const result = await signUp.email({ email: values.email, password: values.password, name: values.name });
      if (result.error) {
        throw new Error(result.error.message || 'Registration failed');
      }
      if (values.inviteCode) {
        await api.post('/family/join', { inviteCode: values.inviteCode });
      }
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Registration failed',
        message: err instanceof Error ? err.message : 'Something went wrong',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title ta="center" mb={4}>
        Join a family
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Already have an account?{' '}
        <Anchor size="sm" href="/login">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Name"
            placeholder="Your name"
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            mt="md"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="At least 8 characters"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <TextInput
            label="Invite code"
            mt="md"
            readOnly
            {...form.getInputProps('inviteCode')}
          />
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Join & create account
          </Button>
        </form>
      </Paper>
    </>
  );
}
