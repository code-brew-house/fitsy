# Profile Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add member profile pages so family members can view each other's activity history, stats, and interact via comments/reactions.

**Architecture:** New `users` API module with a `GET /users/:id/profile` endpoint. Extend existing `GET /activity-logs` to accept a `userId` query param for cross-member activity fetching. Frontend gets a shared `ProfileView` component used by both `/profile` (own) and `/profile/[userId]` (others), plus a `UserLink` component wired into FeedItem, Leaderboard, and comment displays.

**Tech Stack:** NestJS, Prisma, Next.js 15 App Router, Mantine UI v7, TypeScript

---

### Task 1: Add ProfileResponse shared type

**Files:**
- Modify: `packages/shared/src/types.ts:117` (after DashboardResponse)

**Step 1: Add ProfileResponse interface**

Add after the `DashboardResponse` interface (after line 117) in `packages/shared/src/types.ts`:

```typescript
export interface ProfileResponse {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  totalPoints: number;
  activityCount: number;
  currentStreak: number;
  avgPointsPerActivity: number;
  memberSince: string;
}
```

**Step 2: Verify shared package builds**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: add ProfileResponse shared type"
```

---

### Task 2: Create Users Profile API module

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Modify: `apps/api/src/app.module.ts:1-29` (add UsersModule import)

**Step 1: Create the users service**

Create `apps/api/src/users/users.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileResponse } from '@fitsy/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(requestingUserId: string, targetUserId: string): Promise<ProfileResponse> {
    // Fetch both users to verify same family
    const [requester, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { familyId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, image: true, role: true, totalPoints: true, familyId: true, createdAt: true },
      }),
    ]);

    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (!requester?.familyId || !target.familyId || requester.familyId !== target.familyId) {
      throw new ForbiddenException('You can only view profiles of family members');
    }

    // Get activity count
    const activityCount = await this.prisma.activityLog.count({
      where: { userId: targetUserId },
    });

    // Calculate streak (same logic as dashboard)
    const currentStreak = await this.calculateStreak(targetUserId);

    const avgPointsPerActivity = activityCount > 0
      ? Math.round(target.totalPoints / activityCount)
      : 0;

    return {
      id: target.id,
      name: target.name,
      avatarUrl: target.image ?? null,
      role: target.role as any,
      totalPoints: target.totalPoints,
      activityCount,
      currentStreak,
      avgPointsPerActivity,
      memberSince: target.createdAt.toISOString(),
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) return 0;

    const uniqueDates = [
      ...new Set(
        logs.map((log) => {
          const d = new Date(log.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }),
      ),
    ];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const current = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
```

**Step 2: Create the users controller**

Create `apps/api/src/users/users.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';

@Controller('users')
@UseGuards(BetterAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id/profile')
  async getProfile(@Request() req: any, @Param('id') id: string) {
    return this.usersService.getProfile(req.user.id, id);
  }
}
```

**Step 3: Create the users module**

Create `apps/api/src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

**Step 4: Register UsersModule in AppModule**

In `apps/api/src/app.module.ts`, add the import and register it:

Add import at line 12 (after ReactionsModule import):
```typescript
import { UsersModule } from './users/users.module';
```

Add `UsersModule` to the imports array (after `ReactionsModule`).

**Step 5: Verify API compiles**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: No errors

**Step 6: Test manually**

Run: `cd apps/api && pnpm dev`
Then test: `curl http://localhost:4000/users/<some-user-id>/profile` (with valid auth cookie)
Expected: 200 with ProfileResponse JSON, or 403/404 for invalid cases

**Step 7: Commit**

```bash
git add apps/api/src/users/ apps/api/src/app.module.ts
git commit -m "feat: add users profile API endpoint"
```

---

### Task 3: Extend activity-logs endpoint to accept userId param

**Files:**
- Modify: `apps/api/src/activity-logs/activity-logs.controller.ts:36-49`
- Modify: `apps/api/src/activity-logs/activity-logs.service.ts:73-119`

**Step 1: Add userId param to controller**

In `apps/api/src/activity-logs/activity-logs.controller.ts`, modify the `findOwn` method (lines 36-49) to accept a `userId` query param:

Replace the current `findOwn` method with:

```typescript
  @Get()
  async findOwn(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activityTypeId') activityTypeId?: string,
    @Query('userId') userId?: string,
  ) {
    // If userId is provided, fetch that user's logs (with family check)
    if (userId) {
      const requesterFamilyId = await this.familyService.getUserFamilyId(req.user.id);
      const targetFamilyId = await this.familyService.getUserFamilyId(userId);
      if (requesterFamilyId !== targetFamilyId) {
        throw new ForbiddenException('You can only view activities of family members');
      }
    }
    return this.activityLogsService.findOwn(
      userId || req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      activityTypeId,
    );
  }
```

Also add `ForbiddenException` to the imports from `@nestjs/common` at the top of the file (line 1):

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
```

**Step 2: Verify API compiles**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/api/src/activity-logs/activity-logs.controller.ts
git commit -m "feat: extend activity-logs endpoint with userId param"
```

---

### Task 4: Create UserLink component

**Files:**
- Create: `apps/web/src/components/UserLink.tsx`

**Step 1: Create UserLink component**

Create `apps/web/src/components/UserLink.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Group, Avatar, Text } from '@mantine/core';

interface UserLinkProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  size?: 'xs' | 'sm' | 'md';
  fw?: number;
}

export function UserLink({ userId, name, avatarUrl, showAvatar = false, size = 'sm', fw = 600 }: UserLinkProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  if (showAvatar) {
    return (
      <Link href={`/profile/${userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Group gap="sm" wrap="nowrap" style={{ cursor: 'pointer' }}>
          <Avatar src={avatarUrl} color="teal" radius="xl" size={size}>
            {initial}
          </Avatar>
          <Text size={size} fw={fw}>{name}</Text>
        </Group>
      </Link>
    );
  }

  return (
    <Text
      component={Link}
      href={`/profile/${userId}`}
      span
      fw={fw}
      size={size}
      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
    >
      {name}
    </Text>
  );
}
```

**Step 2: Verify web compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: No errors (or only pre-existing errors)

**Step 3: Commit**

```bash
git add apps/web/src/components/UserLink.tsx
git commit -m "feat: add UserLink reusable component"
```

---

### Task 5: Create ProfileView, ProfileHeader, ProfileStats components

**Files:**
- Create: `apps/web/src/components/ProfileHeader.tsx`
- Create: `apps/web/src/components/ProfileStats.tsx`
- Create: `apps/web/src/components/ProfileView.tsx`

**Step 1: Create ProfileHeader**

Create `apps/web/src/components/ProfileHeader.tsx`:

```tsx
'use client';

import { Group, Avatar, Stack, Text, Badge, ActionIcon } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import type { ProfileResponse } from '@fitsy/shared';

interface ProfileHeaderProps {
  profile: ProfileResponse;
  isOwnProfile: boolean;
  onSettingsClick?: () => void;
}

export function ProfileHeader({ profile, isOwnProfile, onSettingsClick }: ProfileHeaderProps) {
  const initial = profile.name?.charAt(0)?.toUpperCase() || '?';
  const memberSince = new Date(profile.memberSince).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Group justify="space-between" align="flex-start">
      <Group gap="md">
        <Avatar src={profile.avatarUrl} color="teal" radius="xl" size={80}>
          <Text size="xl" fw={700}>{initial}</Text>
        </Avatar>
        <Stack gap={4}>
          <Group gap="sm">
            <Text size="xl" fw={700}>{profile.name}</Text>
            <Badge color={profile.role === 'ADMIN' ? 'teal' : 'gray'} variant="light" size="sm">
              {profile.role}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">Member since {memberSince}</Text>
        </Stack>
      </Group>
      {isOwnProfile && onSettingsClick && (
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onSettingsClick}>
          <IconSettings size={20} />
        </ActionIcon>
      )}
    </Group>
  );
}
```

**Step 2: Create ProfileStats**

Create `apps/web/src/components/ProfileStats.tsx`:

```tsx
'use client';

import { SimpleGrid, Paper, Text, Stack } from '@mantine/core';
import { IconTrophy, IconActivity, IconFlame, IconChartBar } from '@tabler/icons-react';
import type { ProfileResponse } from '@fitsy/shared';

interface ProfileStatsProps {
  profile: ProfileResponse;
}

const statConfig = [
  { key: 'totalPoints' as const, label: 'Total Points', icon: IconTrophy, color: 'yellow' },
  { key: 'activityCount' as const, label: 'Activities Logged', icon: IconActivity, color: 'teal' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconFlame, color: 'orange', suffix: ' days' },
  { key: 'avgPointsPerActivity' as const, label: 'Avg Pts/Activity', icon: IconChartBar, color: 'blue' },
];

export function ProfileStats({ profile }: ProfileStatsProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      {statConfig.map(({ key, label, icon: Icon, color, suffix }) => (
        <Paper key={key} p="md" withBorder radius="md">
          <Stack gap={4} align="center">
            <Icon size={24} color={`var(--mantine-color-${color}-6)`} />
            <Text size="xl" fw={700}>{profile[key]}{suffix || ''}</Text>
            <Text size="xs" c="dimmed" ta="center">{label}</Text>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
```

**Step 3: Create ProfileView**

Create `apps/web/src/components/ProfileView.tsx`:

```tsx
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
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
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
        if (err?.message?.includes('403')) {
          setError('You can only view profiles of family members');
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
        <Loader color="teal" />
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
            <Loader color="teal" size="sm" />
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
              color="teal"
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
              color="teal"
            />
            <Group justify="flex-end">
              <Button
                color="teal"
                onClick={() => {
                  notifications.show({
                    title: 'Preferences Saved',
                    message: 'Your color scheme preference has been updated.',
                    color: 'teal',
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
```

**Step 4: Verify web compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: No errors (or only pre-existing errors)

**Step 5: Commit**

```bash
git add apps/web/src/components/ProfileHeader.tsx apps/web/src/components/ProfileStats.tsx apps/web/src/components/ProfileView.tsx
git commit -m "feat: add ProfileView, ProfileHeader, ProfileStats components"
```

---

### Task 6: Wire up profile routes

**Files:**
- Modify: `apps/web/src/app/(app)/profile/page.tsx` (full rewrite)
- Create: `apps/web/src/app/(app)/profile/[userId]/page.tsx`

**Step 1: Rewrite /profile page**

Replace the entire content of `apps/web/src/app/(app)/profile/page.tsx` with:

```tsx
'use client';

import { Container, Center, Loader } from '@mantine/core';
import { useAuth } from '../../../lib/auth-context';
import { ProfileView } from '../../../components/ProfileView';

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <Center py="xl">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Container size="lg">
      <ProfileView userId={user.id} isOwnProfile={true} />
    </Container>
  );
}
```

**Step 2: Create /profile/[userId] dynamic route**

Create `apps/web/src/app/(app)/profile/[userId]/page.tsx`:

```tsx
'use client';

import { use } from 'react';
import { Container, Center, Loader } from '@mantine/core';
import { useAuth } from '../../../../lib/auth-context';
import { ProfileView } from '../../../../components/ProfileView';

export default function MemberProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center py="xl">
        <Loader color="teal" />
      </Center>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <Container size="lg">
      <ProfileView userId={userId} isOwnProfile={isOwnProfile} />
    </Container>
  );
}
```

**Step 3: Verify web compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: No errors (or only pre-existing errors)

**Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/profile/
git commit -m "feat: wire up /profile and /profile/[userId] routes"
```

---

### Task 7: Update FeedItem with UserLink for author and comment names

**Files:**
- Modify: `apps/web/src/components/FeedItem.tsx:1-361`

**Step 1: Add UserLink import**

In `apps/web/src/components/FeedItem.tsx`, add after the existing imports (after line 30):

```typescript
import { UserLink } from './UserLink';
```

**Step 2: Replace activity author name (lines 189-192)**

Replace:
```tsx
            <Text span fw={600}>
              {activity.userName}
            </Text>{' '}
```

With:
```tsx
            <UserLink userId={activity.userId} name={activity.userName} />{' '}
```

**Step 3: Replace comment author name (lines 290-293)**

Replace:
```tsx
                    <Text size="xs">
                      <Text span fw={700}>
                        {comment.userName}
                      </Text>{' '}
```

With:
```tsx
                    <Text size="xs">
                      <UserLink userId={comment.userId} name={comment.userName} size="xs" fw={700} />{' '}
```

**Step 4: Verify web compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: No errors (or only pre-existing errors)

**Step 5: Commit**

```bash
git add apps/web/src/components/FeedItem.tsx
git commit -m "feat: add clickable UserLink to FeedItem author and comments"
```

---

### Task 8: Update Leaderboard with UserLink for ranking entries

**Files:**
- Modify: `apps/web/src/app/(app)/leaderboard/page.tsx`

**Step 1: Add UserLink import**

In `apps/web/src/app/(app)/leaderboard/page.tsx`, add after the FeedItem import (after line 22):

```typescript
import { UserLink } from '../../../components/UserLink';
```

**Step 2: Replace mobile view name/avatar (lines 138-141)**

Replace:
```tsx
                      <Avatar src={entry.avatarUrl} color="teal" radius="xl" size="sm">
                        {entry.userName?.charAt(0)?.toUpperCase() || '?'}
                      </Avatar>
                      <Text fw={500}>{entry.userName}</Text>
```

With:
```tsx
                      <UserLink userId={entry.userId} name={entry.userName} avatarUrl={entry.avatarUrl} showAvatar fw={500} />
```

**Step 3: Replace desktop view name/avatar (lines 179-189)**

Replace:
```tsx
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          src={entry.avatarUrl}
                          color="teal"
                          radius="xl"
                          size="sm"
                        >
                          {entry.userName?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Text fw={500}>{entry.userName}</Text>
                      </Group>
                    </Table.Td>
```

With:
```tsx
                    <Table.Td>
                      <UserLink userId={entry.userId} name={entry.userName} avatarUrl={entry.avatarUrl} showAvatar fw={500} />
                    </Table.Td>
```

**Step 4: Verify web compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: No errors (or only pre-existing errors)

**Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/leaderboard/page.tsx
git commit -m "feat: add clickable UserLink to leaderboard entries"
```

---

### Task 9: Manual smoke test and final verification

**Step 1: Start API and Web dev servers**

Run (if not already running):
```bash
cd apps/api && pnpm dev &
cd apps/web && pnpm dev &
```

**Step 2: Verify profile page loads**

- Navigate to `http://localhost:3000/profile`
- Should show your own profile with header (avatar, name, role, member since), stats (4 cards), and activity feed with pagination
- Settings gear icon should open a modal with color scheme toggle

**Step 3: Verify other member's profile**

- Navigate to leaderboard, click on a family member's name
- Should navigate to `/profile/<their-id>` and show their profile
- Should NOT have the settings gear icon
- Comments and reactions on their activities should work

**Step 4: Verify UserLinks throughout the app**

- On leaderboard page: clicking names navigates to profiles
- On feed items: clicking activity author name navigates to their profile
- In comments: clicking commenter name navigates to their profile

**Step 5: Verify error cases**

- Navigate to `/profile/nonexistent-uuid` — should show "Member not found"

**Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: profile feature polish"
```
