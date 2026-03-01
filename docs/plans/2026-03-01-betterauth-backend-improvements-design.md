# BetterAuth Migration & Backend Improvements Design

**Date**: 2026-03-01
**Status**: Approved
**Scope**: Migrate from custom JWT auth to BetterAuth; fix performance & data integrity issues

---

## 1. BetterAuth Integration

### 1.1 Overview

Replace the custom JWT authentication system with [BetterAuth](https://www.better-auth.com/) — a TypeScript-first auth library with Prisma adapter, session-based auth, and built-in email verification / password reset flows.

**Scope**: Email/password only (no OAuth/2FA/passkeys for now — can be added later via plugins).

### 1.2 Architecture

```
Next.js Frontend (apps/web)
  └─ createAuthClient() from better-auth/react
     ├─ authClient.signIn.email()    → POST /api/auth/sign-in/email
     ├─ authClient.signUp.email()    → POST /api/auth/sign-up/email
     ├─ authClient.signOut()         → POST /api/auth/sign-out
     └─ authClient.useSession()      → GET  /api/auth/get-session

NestJS API (apps/api)
  ├─ main.ts: mount toNodeHandler(auth) on /api/auth/* (BEFORE body parser)
  ├─ src/auth/auth.ts: BetterAuth instance config
  ├─ src/auth/better-auth.guard.ts: custom NestJS guard
  └─ All controllers: @UseGuards(BetterAuthGuard) replaces JwtAuthGuard
```

### 1.3 BetterAuth Configuration

**File**: `apps/api/src/auth/auth.ts`

- **Database**: `prismaAdapter(prisma, { provider: "postgresql" })`
- **Email/Password**: Enabled, bcrypt hashing (matches existing convention), min 8 chars
- **Session**: 7-day expiry, auto-refresh after 1 day
- **Base path**: `/api/auth`
- **Trusted origins**: Configured from `CORS_ORIGIN` env var

**User additional fields** (added to BetterAuth's user table):
- `role: Role` (ADMIN/MEMBER, default MEMBER)
- `familyId: String?` (FK to Family)
- `totalPoints: Int` (default 0)

### 1.4 Schema Changes (Prisma)

**New tables** (managed by BetterAuth):

| Table | Purpose |
|-------|---------|
| `session` | Active sessions (id, token, userId, expiresAt, ipAddress, userAgent) |
| `account` | Auth providers + credentials (id, userId, providerId, password hash) |
| `verification` | Email verification tokens |

**Modified `User` table** (renamed to lowercase `user` per BetterAuth convention):

| Change | Detail |
|--------|--------|
| Add `emailVerified` | `Boolean @default(false)` |
| Add `updatedAt` | `DateTime @updatedAt` |
| Rename `avatarUrl` → `image` | BetterAuth convention (or use field mapping) |
| Remove `passwordHash` | Moved to `account` table |
| Add `sessions` relation | `session[]` |
| Add `accounts` relation | `account[]` |

### 1.5 Guard Replacement

**Remove**:
- `JwtAuthGuard` — replaced by `BetterAuthGuard`
- `JwtStrategy` — no longer needed (sessions, not JWTs)
- Dependencies: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`

**Add**: `BetterAuthGuard`
```typescript
// Calls auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
// Populates req.user = { userId: session.user.id, email: session.user.email }
// Returns 401 if no valid session
```

**Keep**: `RolesGuard` and `@Roles()` decorator (unchanged — already queries DB for role).

### 1.6 Frontend Changes

**Remove**:
- Custom `ApiClient` token management (`setToken`, `getToken`, localStorage)
- `Authorization: Bearer` header injection
- Manual auth state management in `AuthContext`

**Add**:
- `createAuthClient()` from `better-auth/react` — handles cookies, session refresh
- `useSession()` hook replaces manual `refreshUser()` calls
- `authClient.signIn.email()` / `authClient.signUp.email()` replace manual API calls
- API client simplified — cookies sent automatically, no token header needed

**Modify**:
- `AuthContext` simplified to wrap BetterAuth's client
- Route protection uses `useSession()` instead of checking `user` state
- Login/Register pages call BetterAuth client methods

### 1.7 What BetterAuth Gives Us (vs Current)

| Feature | Current (JWT) | After (BetterAuth) |
|---------|---------------|---------------------|
| Session revocation | Impossible (stateless) | Instant (delete DB row) |
| Multi-device sessions | No visibility | Full list, revoke any |
| Email verification | Not implemented | Built-in |
| Password reset | Not implemented | Built-in |
| Token storage | localStorage (XSS risk) | HttpOnly cookie |
| Refresh mechanism | None (7-day hard expiry) | Auto-refresh |
| CSRF protection | None | Built-in |

---

## 2. Performance & Data Integrity Improvements

### 2.1 Missing Database Indexes

Add composite/single indexes for common query patterns:

```prisma
model ActivityLog {
  // ... existing fields
  @@index([userId, createdAt])     // Feed, history, streak queries
  @@index([activityTypeId])        // Join optimization
}

model user {
  // ... existing fields
  @@index([familyId])              // Family member lookups
}

model ActivityType {
  // ... existing fields
  @@index([familyId])              // Family-scoped activity type queries
}

model Reward {
  // ... existing fields
  @@index([familyId])              // Family-scoped reward queries
}

model Redemption {
  // ... existing fields
  @@index([userId, status])        // User redemption history
}

model Comment {
  // ... existing fields
  @@index([activityLogId])         // Comments on a log
}

model Reaction {
  // ... existing fields
  @@index([activityLogId])         // Reactions on a log
}
```

### 2.2 N+1 Query Fix in Activity Feed

**Current** (`activity-logs.service.ts:findFeed`):
```typescript
// Query 1: Get all family user IDs
const users = await this.prisma.user.findMany({ where: { familyId } });
// Query 2: Get logs for those user IDs
const logs = await this.prisma.activityLog.findMany({ where: { userId: { in: userIds } } });
```

**Fixed**:
```typescript
// Single query with relation filter
const logs = await this.prisma.activityLog.findMany({
  where: { user: { familyId } },
  include: { user: true, activityType: true, ... },
  orderBy: { createdAt: 'desc' },
  take: limit,
});
```

### 2.3 Redemption Race Condition Fix

**Problem**: Two concurrent redemptions can make `quantity` go negative.

**Fix 1**: Database constraint:
```sql
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_quantity_non_negative"
  CHECK (quantity IS NULL OR quantity >= 0);
```

**Fix 2**: Optimistic update in transaction — use `updateMany` with a `where` that includes `quantity: { gt: 0 }` and check the update count:
```typescript
const updated = await tx.reward.updateMany({
  where: { id: dto.rewardId, quantity: { gt: 0 } },
  data: { quantity: { decrement: 1 } },
});
if (updated.count === 0) throw new BadRequestException('Reward out of stock');
```

### 2.4 Leaderboard Optimization

For "all-time" period, use `User.totalPoints` directly instead of aggregating all activity logs:
```typescript
if (period === 'alltime') {
  const members = await this.prisma.user.findMany({
    where: { familyId },
    select: { id: true, name: true, image: true, totalPoints: true },
    orderBy: { totalPoints: 'desc' },
  });
  // Map to LeaderboardEntry format
}
// For 'week'/'month', keep existing groupBy aggregation
```

### 2.5 Invite Code Entropy

**Current**: `randomBytes(4).toString('hex')` — 32-bit entropy (4 billion codes).

**Fixed**: `randomBytes(8).toString('hex')` — 64-bit entropy. Still 16 hex chars (shareable), but practically unguessable.

### 2.6 Streak Calculation Fix

**Current**: Fetches all logs without ordering, then sorts dates in JavaScript.

**Fixed**: Add `orderBy: { createdAt: 'desc' }` to the Prisma query. Removes the need for JavaScript sorting.

### 2.7 Dependency Cleanup

Remove unused packages:
- `class-validator` — Zod handles all validation
- `class-transformer` — not used anywhere

---

## 3. Files Affected

### API (apps/api)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add session/account/verification tables, modify user table, add indexes |
| `src/main.ts` | Mount BetterAuth handler, disable body parser |
| `src/auth/auth.ts` | **New** — BetterAuth instance configuration |
| `src/auth/better-auth.guard.ts` | **New** — custom NestJS guard |
| `src/auth/auth.module.ts` | Remove JWT/Passport, export BetterAuth guard |
| `src/auth/auth.service.ts` | Simplify — remove JWT logic, keep family-joining logic |
| `src/auth/auth.controller.ts` | Simplify — remove login/register (BetterAuth handles), keep `/me` |
| `src/auth/jwt.strategy.ts` | **Delete** |
| `src/auth/jwt-auth.guard.ts` | **Delete** |
| `src/activity-logs/activity-logs.service.ts` | Fix N+1 feed query |
| `src/dashboard/dashboard.service.ts` | Fix streak orderBy |
| `src/leaderboard/leaderboard.service.ts` | Use totalPoints for all-time |
| `src/family/family.service.ts` | Increase invite code entropy |
| `src/redemptions/redemptions.service.ts` | Fix race condition |
| `package.json` | Add better-auth, remove JWT/Passport deps |
| All controllers using `@UseGuards(JwtAuthGuard)` | Change to `@UseGuards(BetterAuthGuard)` |

### Web (apps/web)

| File | Change |
|------|--------|
| `src/lib/auth.ts` | **New** — BetterAuth client instance |
| `src/lib/auth-context.tsx` | Rewrite to use BetterAuth client |
| `src/lib/api.ts` | Remove token management, simplify to credentials: 'include' |
| `src/app/(auth)/login/page.tsx` | Use authClient.signIn.email() |
| `src/app/(auth)/register/page.tsx` | Use authClient.signUp.email() |
| `src/app/(app)/layout.tsx` | Use useSession() for route protection |
| `package.json` | Add better-auth |

### Shared (packages/shared)

| File | Change |
|------|--------|
| `src/types.ts` | Update UserResponse (emailVerified, image vs avatarUrl) |
| `src/schemas.ts` | Remove loginSchema/registerSchema (BetterAuth handles validation) |

---

## 4. Non-Goals (Explicitly Out of Scope)

- OAuth / social login providers
- Two-factor authentication
- Passkeys / WebAuthn
- Structured logging / monitoring
- Security hardening (Helmet, rate limiting) — beyond what BetterAuth provides
- Audit trail / updatedAt fields (beyond what BetterAuth adds)
- Background jobs / queues
- E2E test coverage
