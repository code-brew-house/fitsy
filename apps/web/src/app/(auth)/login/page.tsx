'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Anchor, Button, Paper, PasswordInput, Text, TextInput, Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { signIn } from '../../../lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length > 0 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const result = await signIn.email({ email: values.email, password: values.password });
      if (result.error) {
        throw new Error(result.error.message || 'Login failed');
      }
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Login failed',
        message: err instanceof Error ? err.message : 'Something went wrong',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title ta="center" mb={4}>Welcome back</Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Don&apos;t have an account?{' '}
        <Anchor size="sm" href="/register">Register</Anchor>
      </Text>
      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label="Email" placeholder="you@example.com" required {...form.getInputProps('email')} />
          <PasswordInput label="Password" placeholder="Your password" required mt="md" {...form.getInputProps('password')} />
          <Button type="submit" fullWidth mt="xl" loading={loading}>Sign in</Button>
        </form>
      </Paper>
    </>
  );
}
