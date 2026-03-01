# Profile Feature Design

## Overview

Add member profile pages to Fitsy so family members can view each other's activity history, stats, and interact via comments/reactions. Reuses existing FeedItem component and comment/reaction infrastructure.

## Routing

- `/profile` — Authenticated user's own profile. Shows feed+stats with a settings gear icon for preferences (color scheme).
- `/profile/[userId]` — Any family member's profile. Dynamic route. If userId matches current user, behaves like own profile.

Clickable names/avatars throughout the app (leaderboard, feed items, comments) link to `/profile/{userId}`.

## API

### New: `GET /users/:id/profile`

Returns public profile data for a family member. Requires same-family membership.

```typescript
interface ProfileResponse {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  totalPoints: number;
  activityCount: number;
  currentStreak: number;
  avgPointsPerActivity: number;
  memberSince: string;
}
```

### Extended: `GET /activity-logs`

Add optional `userId` query param. When provided, returns that user's activity logs (with same-family check). Keeps existing pagination (`page`, `limit`) and `activityTypeId` filter.

### Existing (no changes)

Comment and reaction endpoints already work for any activity within the family — no modifications needed.

## Frontend Components

### New

- **`ProfileView`** — Main component, used by both routes. Props: `userId`, `isOwnProfile`. Fetches profile + paginated activities. Renders header, stats, filter, feed.
- **`ProfileHeader`** — Large avatar (80px), name, role badge, "Member since" date.
- **`ProfileStats`** — 4 stat cards: Total Points, Activities Logged, Current Streak, Avg Points/Activity. Responsive grid.
- **`UserLink`** — Reusable clickable name/avatar. Props: `userId`, `name`, `avatarUrl?`, `showAvatar?`. Wraps in `<Link href="/profile/{userId}">`.

### Modified

- **FeedItem** — Author name → `UserLink`
- **Leaderboard** — Ranking name/avatar → `UserLink`
- **Comment display** (in FeedItem) — Commenter name → `UserLink`

## Data Flow

1. User clicks name/avatar → navigates to `/profile/[userId]`
2. ProfileView mounts → parallel fetch profile data + first page of activities
3. Paginate/filter → fetch next page
4. Comment/react on FeedItem → existing FeedItem logic (no changes)

## Access Control

- Family-scoped: can only view profiles within own family
- `GET /users/:id/profile` checks `req.user.familyId === targetUser.familyId` → 403 if not
- `GET /activity-logs?userId=X` same family check

## Error Handling

- User not found: 404 → "Member not found" with back link
- Not same family: 403 → "You can only view profiles of family members"
- No activities: Stats at zero, empty feed with encouraging message
- User left family: 404 (familyId no longer matches)

## Shared Types

```typescript
// packages/shared/src/types/profile.types.ts
interface ProfileResponse {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  totalPoints: number;
  activityCount: number;
  currentStreak: number;
  avgPointsPerActivity: number;
  memberSince: string;
}
```
