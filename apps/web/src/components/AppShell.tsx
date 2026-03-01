'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  AppShell as MantineAppShell,
  Group,
  NavLink,
  Text,
  Menu,
  ActionIcon,
  UnstyledButton,
  Avatar,
  Divider,
  Box,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconPlus,
  IconGift,
  IconTrophy,
  IconHistory,
  IconListDetails,
  IconReceipt,
  IconUser,
  IconSettings,
  IconLogout,
  IconMenu2,
} from '@tabler/icons-react';
import { Role } from '@fitsy/shared';
import { useAuth } from '../lib/auth-context';
import { ThemeToggle } from './ThemeToggle';
import { PointsBadge } from './PointsBadge';
import { FitsyLogo } from './FitsyLogo';

const mainNav = [
  { label: 'Dashboard', icon: IconDashboard, href: '/dashboard' },
  { label: 'Log Activity', icon: IconPlus, href: '/log' },
  { label: 'Rewards', icon: IconGift, href: '/rewards' },
  { label: 'Leaderboard', icon: IconTrophy, href: '/leaderboard' },
];

const secondaryNav = [
  { label: 'My Activities', icon: IconListDetails, href: '/my-activities' },
  { label: 'History', icon: IconHistory, href: '/history' },
  { label: 'Redemptions', icon: IconReceipt, href: '/redemptions' },
  { label: 'Profile', icon: IconUser, href: '/profile' },
];

const adminNav = [
  { label: 'Manage Activities', icon: IconSettings, href: '/admin/activities' },
  { label: 'Manage Rewards', icon: IconGift, href: '/admin/rewards' },
  { label: 'Members', icon: IconUser, href: '/admin/members' },
  { label: 'Redemptions', icon: IconReceipt, href: '/admin/redemptions' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);

  const isAdmin = user?.role === Role.ADMIN;

  const navigate = (href: string) => {
    router.push(href);
    close();
  };

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* Header */}
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <ActionIcon
              variant="default"
              size="lg"
              hiddenFrom="sm"
              onClick={toggle}
            >
              <IconMenu2 size={18} />
            </ActionIcon>
            <Group
              gap="xs"
              align="center"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
            >
              <FitsyLogo size={32} />
              <Text size="xl" fw={800} c="teal" style={{ letterSpacing: '-0.01em' }}>
                Fitsy
              </Text>
            </Group>
          </Group>
          <Group gap="sm">
            <PointsBadge />
            <ThemeToggle />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Avatar color="teal" radius="xl" size="md">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.name}</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={logout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </MantineAppShell.Header>

      {/* Desktop sidebar */}
      <MantineAppShell.Navbar p="sm">
        <Stack gap={4}>
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={pathname === item.href}
              onClick={() => navigate(item.href)}
            />
          ))}
          <Divider my="xs" />
          {secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={pathname === item.href}
              onClick={() => navigate(item.href)}
            />
          ))}
          {isAdmin && (
            <>
              <Divider my="xs" label="Admin" labelPosition="center" />
              {adminNav.map((item) => (
                <NavLink
                  key={item.href}
                  label={item.label}
                  leftSection={<item.icon size={20} />}
                  active={pathname === item.href}
                  onClick={() => navigate(item.href)}
                />
              ))}
            </>
          )}
        </Stack>
        <Box mt="auto" pt="md">
          <NavLink
            label="Logout"
            leftSection={<IconLogout size={20} />}
            onClick={logout}
            c="red"
          />
        </Box>
      </MantineAppShell.Navbar>

      {/* Main content */}
      <MantineAppShell.Main>
        {children}

        {/* Mobile bottom navigation */}
        <Box
          hiddenFrom="sm"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            borderTop: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-body)',
          }}
        >
          <Group grow gap={0} h={60}>
            {mainNav.map((item) => (
              <UnstyledButton
                key={item.href}
                onClick={() => navigate(item.href)}
                style={{ textAlign: 'center' }}
                py="xs"
              >
                <Stack align="center" gap={2}>
                  <item.icon
                    size={22}
                    color={
                      pathname === item.href
                        ? 'var(--mantine-color-teal-6)'
                        : 'var(--mantine-color-dimmed)'
                    }
                  />
                  <Text
                    size="xs"
                    c={pathname === item.href ? 'teal' : 'dimmed'}
                    fw={pathname === item.href ? 600 : 400}
                  >
                    {item.label}
                  </Text>
                </Stack>
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
