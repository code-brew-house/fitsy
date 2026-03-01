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
import { motion } from 'framer-motion';
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
import { PwaInstallButton } from './PwaInstallButton';
import { PageTransition } from './PageTransition';
import { useHaptics } from '../hooks/useHaptics';

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
  const { vibrate } = useHaptics();

  const isAdmin = user?.role === Role.ADMIN;

  const navigate = (href: string) => {
    vibrate('tap');
    router.push(href);
    close();
  };

  const activeTabIndex = mainNav.findIndex((item) => pathname === item.href);

  return (
    <MantineAppShell
      header={{ height: 60 }}
      footer={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
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
              <Text size="xl" fw={800} c="indigo" style={{ letterSpacing: '-0.01em' }} visibleFrom="sm">
                Fitsy
              </Text>
            </Group>
          </Group>
          <Group gap="sm">
            <PwaInstallButton />
            <Box visibleFrom="sm">
              <PointsBadge />
            </Box>
            <ThemeToggle />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Avatar color="indigo" radius="xl" size="md">
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

      <MantineAppShell.Navbar p="sm">
        <Stack gap={4}>
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={pathname === item.href}
              onClick={() => navigate(item.href)}
              color="indigo"
              variant={pathname === item.href ? 'light' : 'subtle'}
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
              color="indigo"
              variant={pathname === item.href ? 'light' : 'subtle'}
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
                  color="indigo"
                  variant={pathname === item.href ? 'light' : 'subtle'}
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

      <MantineAppShell.Main>
        <PageTransition>{children}</PageTransition>
      </MantineAppShell.Main>

      <MantineAppShell.Footer
        hiddenFrom="sm"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-body)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Group grow gap={0} h={60} style={{ position: 'relative' }}>
          {activeTabIndex >= 0 && (
            <motion.div
              layoutId="bottomNavIndicator"
              style={{
                position: 'absolute',
                top: 2,
                width: `${100 / mainNav.length}%`,
                left: `${(activeTabIndex * 100) / mainNav.length}%`,
                display: 'flex',
                justifyContent: 'center',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <Box
                style={{
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: 'var(--mantine-color-indigo-6)',
                }}
              />
            </motion.div>
          )}
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <UnstyledButton
                key={item.href}
                onClick={() => navigate(item.href)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  width: '100%',
                }}
              >
                <motion.div whileTap={{ scale: 0.85 }}>
                  <Stack align="center" gap={2}>
                    <item.icon
                      size={22}
                      color={
                        isActive
                          ? 'var(--mantine-color-indigo-6)'
                          : 'var(--mantine-color-dimmed)'
                      }
                      strokeWidth={isActive ? 2.5 : 1.5}
                    />
                    <Text
                      size="xs"
                      c={isActive ? 'indigo' : 'dimmed'}
                      fw={isActive ? 700 : 400}
                    >
                      {item.label}
                    </Text>
                  </Stack>
                </motion.div>
              </UnstyledButton>
            );
          })}
        </Group>
      </MantineAppShell.Footer>
    </MantineAppShell>
  );
}
