# Fitsy — Family Fitness Habit Tracker Design

## Overview

Fitsy is a progressive web app (PWA) that gamifies physical activity for families. Members log workouts to earn points based on configurable activity types, then redeem those points for rewards managed by the family admin. A leaderboard and activity feed add friendly competition.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, PWA) |
| UI | Mantine UI v7 + dark mode |
| Backend | NestJS |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Monorepo | Turborepo |
| Shared | TypeScript types + Zod validation schemas |
| Auth | JWT (email + password) |
| Infra | Docker Compose (local), Dokploy (prod) |

## Repo Structure

```
fitsy/
├── apps/
│   ├── web/              # Next.js PWA (App Router)
│   └── api/              # NestJS backend
├── packages/
│   └── shared/           # Shared TS types + Zod schemas
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Data Model

### Family

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | Family display name |
| inviteCode | String | Unique, regeneratable |
| createdAt | DateTime | |

### User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| email | String | Unique |
| passwordHash | String | bcrypt hashed |
| name | String | Display name |
| avatarUrl | String? | Optional profile image |
| role | Enum | ADMIN or MEMBER |
| familyId | UUID | FK → Family |
| totalPoints | Int | Running balance (earned - spent) |
| createdAt | DateTime | |

### ActivityType

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| familyId | UUID | FK → Family |
| name | String | e.g. "Running", "Gym Workout" |
| icon | String | Emoji or icon name |
| measurementType | Enum | DISTANCE, EFFORT, FLAT, DURATION |
| pointsPerUnit | Float? | For DISTANCE (pts per km) |
| unit | String? | For DISTANCE (always "km") |
| pointsLow | Int? | For EFFORT |
| pointsMedium | Int? | For EFFORT |
| pointsHigh | Int? | For EFFORT |
| pointsExtreme | Int? | For EFFORT |
| flatPoints | Int? | For FLAT |
| pointsPerMinute | Float? | For DURATION |
| isActive | Boolean | Soft delete |
| createdAt | DateTime | |

**Measurement types:**

- **DISTANCE**: User enters km. Points = distanceKm × pointsPerUnit
- **EFFORT**: User picks Low/Medium/High/Extreme. Points = corresponding tier value
- **FLAT**: User taps "Log it". Points = flatPoints
- **DURATION**: User enters minutes. Points = durationMinutes × pointsPerMinute

### ActivityLog

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK → User |
| activityTypeId | UUID | FK → ActivityType |
| measurementType | Enum | Denormalized for queries |
| distanceKm | Float? | For DISTANCE |
| effortLevel | Enum? | LOW, MEDIUM, HIGH, EXTREME |
| durationMinutes | Int? | For DURATION |
| pointsEarned | Int | Calculated at creation |
| createdAt | DateTime | |

### Reward

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| familyId | UUID | FK → Family |
| name | String | Reward name |
| description | String | Details |
| imageUrl | String? | Optional image |
| pointCost | Int | Points required to redeem |
| quantity | Int? | Null = unlimited |
| isActive | Boolean | Soft delete |
| createdAt | DateTime | |

### Redemption

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK → User |
| rewardId | UUID | FK → Reward |
| pointsSpent | Int | Snapshot of cost at redemption |
| status | Enum | PENDING, FULFILLED, CANCELLED |
| createdAt | DateTime | |

## API Design (NestJS)

### Auth Module

- `POST /auth/register` — Create account (optionally with invite code)
- `POST /auth/login` — Returns JWT
- `GET /auth/me` — Current user + family info

### Family Module

- `POST /family` — Create family (user becomes admin)
- `POST /family/join` — Join via invite code
- `GET /family` — Get family details
- `PATCH /family` — Update family name (admin)
- `POST /family/regenerate-code` — New invite code (admin)

### Members Module

- `GET /family/members` — List family members
- `DELETE /family/members/:id` — Remove member (admin)

### ActivityTypes Module

- `GET /activity-types` — List family's activity types
- `POST /activity-types` — Create activity type (admin)
- `PATCH /activity-types/:id` — Update activity type (admin)
- `DELETE /activity-types/:id` — Soft delete (admin)

### ActivityLogs Module

- `POST /activity-logs` — Log an activity
- `GET /activity-logs` — Own activity history (paginated, filterable)
- `GET /activity-logs/feed` — Family activity feed (recent, all members)

### Rewards Module

- `GET /rewards` — List family's reward catalog
- `POST /rewards` — Create reward (admin)
- `PATCH /rewards/:id` — Update reward (admin)
- `DELETE /rewards/:id` — Soft delete (admin)

### Redemptions Module

- `POST /redemptions` — Redeem a reward (deducts points)
- `GET /redemptions` — Own redemption history
- `GET /redemptions/all` — All family redemptions (admin)
- `PATCH /redemptions/:id/fulfill` — Mark as fulfilled (admin)

### Leaderboard Module

- `GET /leaderboard?period=week|month|alltime` — Family rankings

### Dashboard Module

- `GET /dashboard` — Aggregated stats for current user

### Auth Guards

- All routes except register/login require valid JWT
- Admin-only routes checked via role-based guard
- All data scoped to user's family

## Pages (Next.js App Router)

### Public

| Route | Purpose |
|-------|---------|
| `/login` | Email + password login |
| `/register` | Sign up + optional invite code |
| `/join/:code` | Direct invite link → register pre-filled |

### Authenticated (Member)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Personal stats, quick log button, recent activity |
| `/log` | Log an activity (select type → enter value → submit) |
| `/history` | Own activity history with filters |
| `/rewards` | Browse reward catalog + redeem |
| `/redemptions` | Own redemption history |
| `/leaderboard` | Family rankings + activity feed |
| `/profile` | Edit name, avatar, dark mode toggle |
| `/settings` | Change password |

### Admin Only

| Route | Purpose |
|-------|---------|
| `/admin/activities` | Manage activity types (CRUD) |
| `/admin/rewards` | Manage reward catalog (CRUD) |
| `/admin/members` | View/remove members, see invite code |
| `/admin/redemptions` | View all redemptions, mark as fulfilled |

## UI Components

| Component | Description |
|-----------|-------------|
| AppShell | Mantine AppShell: bottom nav (mobile) / sidebar (desktop), dark mode toggle in header |
| QuickLogFAB | Floating action button on dashboard for quick activity logging |
| ActivityCard | Activity type icon, measurement input, calculated points preview |
| RewardCard | Reward image, name, point cost, "Redeem" button |
| LeaderboardTable | Ranked family members with points, period toggle |
| FeedItem | Activity feed: avatar + "Name did Activity → +X pts" + timestamp |
| PointsBadge | Current point balance shown in header/nav |
| StatCards | Dashboard cards: total points, activities this week, current streak |

### Mobile-First Layout

- Bottom navigation: Dashboard, Log, Rewards, Leaderboard (4 tabs)
- Admin sections via hamburger/profile menu
- Forms optimized for thumb-reach
- PWA: service worker, manifest, installable

## Infrastructure

### Local Development (Docker Compose)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: fitsy
      POSTGRES_USER: fitsy
      POSTGRES_PASSWORD: fitsy_dev

  api:
    build: ./apps/api
    ports: ["4000:4000"]
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgresql://fitsy:fitsy_dev@postgres:5432/fitsy
      JWT_SECRET: dev-secret

  web:
    build: ./apps/web
    ports: ["3000:3000"]
    depends_on: [api]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000

volumes:
  pgdata:
```

### Dokploy Deployment

- Two services: `fitsy-web` (port 3000) and `fitsy-api` (port 4000)
- PostgreSQL as managed database in Dokploy
- Environment variables via Dokploy dashboard
- Multi-stage Dockerfiles for optimized images
- Next.js standalone output mode for minimal container size

## Default Activity Seeds

When a family is created, seed these activity types:

| Activity | Type | Points |
|----------|------|--------|
| Running | DISTANCE | 1 pt/km |
| Cycling | DISTANCE | 1 pt/2.5km (0.4 pt/km) |
| Incline Treadmill | DISTANCE | 1 pt/0.5km (2 pt/km) |
| Home Treadmill | DISTANCE | 1 pt/km |
| Gym Workout | EFFORT | Low=4, Med=6, High=8, Extreme=12 |
| Outdoor Park Walk | FLAT | 5 pts |

## Out of Scope

- OAuth/social login
- Photo proof / approval workflows
- Multi-family membership
- Push notifications
- Fitness device integrations
- Gamification beyond points (badges, streak rewards, challenges)
