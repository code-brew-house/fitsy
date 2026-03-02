# Family → Club Rename + Navbar Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the "Family" concept to "Club" across the entire stack (DB, API, shared types, frontend, URLs) and fix mobile navbar content hidden behind the bottom nav.

**Architecture:** Big-bang rename — single migration renames DB tables/columns, then update all code layers top-to-bottom (shared → API → frontend). Navbar fix is a one-line CSS change.

**Tech Stack:** PostgreSQL, Prisma 6, NestJS 11, Next.js 15, Mantine UI v7, TypeScript

---

### Task 1: Navbar Bottom Padding Fix

Quick win — fix the mobile navbar overlapping the bottom nav.

**Files:**
- Modify: `apps/web/src/components/AppShell.tsx:149`

**Step 1: Add paddingBottom to navbar**

In `apps/web/src/components/AppShell.tsx`, the `<MantineAppShell.Navbar>` at line 149 currently has `p="sm"`. Add a style prop with paddingBottom for mobile. Since the navbar itself is only visible on mobile when opened (collapsed via breakpoint 'sm'), we can safely add the padding unconditionally:

```tsx
<MantineAppShell.Navbar p="sm" style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
```

**Step 2: Verify visually**

Run: `cd apps/web && pnpm dev`
Open on mobile viewport, toggle hamburger menu, scroll to bottom of navbar — verify "Logout" and admin items are fully visible above the bottom nav.

**Step 3: Commit**

```bash
git add apps/web/src/components/AppShell.tsx
git commit -m "fix: add bottom padding to mobile navbar to prevent overlap with bottom nav"
```

---

### Task 2: Shared Types & Schemas Rename

Update the shared package first since both API and web depend on it.

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/types.ts`

**Step 1: Rename schemas in `packages/shared/src/schemas.ts`**

Replace:
- `// Family` comment → `// Club`
- `createFamilySchema` → `createClubSchema`
- `joinFamilySchema` → `joinClubSchema`
- `updateFamilySchema` → `updateClubSchema`

**Step 2: Rename types in `packages/shared/src/types.ts`**

Replace:
- `CreateFamilyDto` → `CreateClubDto` (and reference `schemas.createClubSchema`)
- `JoinFamilyDto` → `JoinClubDto` (and reference `schemas.joinClubSchema`)
- `UpdateFamilyDto` → `UpdateClubDto` (and reference `schemas.updateClubSchema`)
- `FamilyResponse` → `ClubResponse`
- `UserResponse.familyId` → `UserResponse.clubId`

**Step 3: Build shared package to verify**

Run: `cd packages/shared && pnpm build`
Expected: Clean build, no errors.

**Step 4: Commit**

```bash
git add packages/shared/src/schemas.ts packages/shared/src/types.ts
git commit -m "refactor: rename Family types/schemas to Club in shared package"
```

---

### Task 3: Database Migration + Prisma Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: New Prisma migration (via `prisma migrate dev`)

**Step 1: Update Prisma schema**

In `apps/api/prisma/schema.prisma`:

1. Rename model `Family` → `Club` (line 112-120):
```prisma
model Club {
  id            String         @id @default(uuid())
  name          String
  inviteCode    String         @unique
  createdAt     DateTime       @default(now())
  users         User[]
  activityTypes ActivityType[]
  rewards       Reward[]
}
```

2. Update `User` model (lines 48-49, 62):
```prisma
  clubId        String?
  club          Club?     @relation(fields: [clubId], references: [id])
  ...
  @@index([clubId])
```

3. Update `ActivityType` model (lines 124-125, 141):
```prisma
  clubId          String
  club            Club          @relation(fields: [clubId], references: [id])
  ...
  @@index([clubId])
```

4. Update `Reward` model (lines 192-193, 203):
```prisma
  clubId      String
  club        Club         @relation(fields: [clubId], references: [id])
  ...
  @@index([clubId])
```

**Step 2: Create a manual migration**

Since we're renaming (not dropping and recreating), we need a custom migration. Create the migration directory and SQL manually:

```bash
mkdir -p apps/api/prisma/migrations/$(date +%Y%m%d%H%M%S)_rename_family_to_club
```

Write the migration SQL file:
```sql
-- Rename Family table to Club
ALTER TABLE "Family" RENAME TO "Club";

-- Rename familyId columns
ALTER TABLE "user" RENAME COLUMN "familyId" TO "clubId";
ALTER TABLE "ActivityType" RENAME COLUMN "familyId" TO "clubId";
ALTER TABLE "Reward" RENAME COLUMN "familyId" TO "clubId";

-- Rename indexes
ALTER INDEX "user_familyId_idx" RENAME TO "user_clubId_idx";
ALTER INDEX "ActivityType_familyId_idx" RENAME TO "ActivityType_clubId_idx";
ALTER INDEX "Reward_familyId_idx" RENAME TO "Reward_clubId_idx";

-- Rename foreign key constraints
ALTER TABLE "user" RENAME CONSTRAINT "user_familyId_fkey" TO "user_clubId_fkey";
ALTER TABLE "ActivityType" RENAME CONSTRAINT "ActivityType_familyId_fkey" TO "ActivityType_clubId_fkey";
ALTER TABLE "Reward" RENAME CONSTRAINT "Reward_familyId_fkey" TO "Reward_clubId_fkey";
```

**Step 3: Apply migration and generate client**

Run:
```bash
cd apps/api && npx prisma migrate dev --name rename_family_to_club
```

If Prisma detects drift (because we manually wrote the SQL and already changed the schema), use:
```bash
cd apps/api && npx prisma migrate resolve --applied <migration_name>
cd apps/api && npx prisma generate
```

Verify: `npx prisma db pull` should match the schema with no diff.

**Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "refactor: rename Family table/columns to Club via migration"
```

---

### Task 4: API Club Module (rename family → club)

**Files:**
- Delete: `apps/api/src/family/` (entire directory)
- Create: `apps/api/src/club/club.module.ts`
- Create: `apps/api/src/club/club.controller.ts`
- Create: `apps/api/src/club/club.service.ts`
- Create: `apps/api/src/club/club.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create club module directory and files**

Create `apps/api/src/club/club.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ClubService } from './club.service';
import { ClubController } from './club.controller';

@Module({
  controllers: [ClubController],
  providers: [ClubService],
  exports: [ClubService],
})
export class ClubModule {}
```

Create `apps/api/src/club/club.controller.ts` — same as family.controller.ts but with:
- Import `ClubService` from `./club.service`
- Import `createClubSchema, joinClubSchema, updateClubSchema` from `@fitsy/shared`
- `@Controller('club')` instead of `@Controller('family')`
- Class name `ClubController`
- Constructor: `private clubService: ClubService`
- All `this.familyService` → `this.clubService`
- All `getUserFamilyId` → `getUserClubId`
- All `familyId` local vars → `clubId`

Create `apps/api/src/club/club.service.ts` — same as family.service.ts but with:
- Import `CreateClubDto, JoinClubDto, UpdateClubDto` from `@fitsy/shared`
- Class name `ClubService`
- All method names: `createFamily` → `createClub`, `joinFamily` → `joinClub`, `getFamily` → `getClub`, `updateFamily` → `updateClub`, `getUserFamilyId` → `getUserClubId`
- All `familyId` vars → `clubId`
- All `this.prisma.family` → `this.prisma.club`
- All error messages: "family" → "club"
- All Prisma field refs: `familyId` → `clubId`

Create `apps/api/src/club/club.service.spec.ts` — same as family.service.spec.ts but with:
- `ClubService` references
- `prisma.club` instead of `prisma.family`
- `'club-1'` IDs instead of `'family-1'`
- Updated error messages
- All `familyId` → `clubId`

**Step 2: Update app.module.ts**

Replace:
```typescript
import { FamilyModule } from './family/family.module';
```
With:
```typescript
import { ClubModule } from './club/club.module';
```

And in imports array: `FamilyModule` → `ClubModule`

**Step 3: Delete old family directory**

```bash
rm -rf apps/api/src/family/
```

**Step 4: Build API to verify**

Run: `cd apps/api && pnpm build`
Expected: Clean compile.

**Step 5: Run club service tests**

Run: `cd apps/api && npx jest club.service.spec --verbose`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add apps/api/src/club/ apps/api/src/app.module.ts
git rm -r apps/api/src/family/
git commit -m "refactor: rename family API module to club"
```

---

### Task 5: Update All Other API Services

Update every service/controller that references `familyId`, `FamilyService`, or `getUserFamilyId`.

**Files:**
- Modify: `apps/api/src/activity-types/activity-types.controller.ts`
- Modify: `apps/api/src/activity-types/activity-types.service.ts`
- Modify: `apps/api/src/activity-types/activity-types.service.spec.ts`
- Modify: `apps/api/src/activity-logs/activity-logs.controller.ts`
- Modify: `apps/api/src/activity-logs/activity-logs.service.ts`
- Modify: `apps/api/src/activity-logs/activity-logs.service.spec.ts`
- Modify: `apps/api/src/rewards/rewards.controller.ts`
- Modify: `apps/api/src/rewards/rewards.service.ts`
- Modify: `apps/api/src/leaderboard/leaderboard.controller.ts`
- Modify: `apps/api/src/leaderboard/leaderboard.service.ts`
- Modify: `apps/api/src/redemptions/redemptions.controller.ts`
- Modify: `apps/api/src/redemptions/redemptions.service.ts`
- Modify: `apps/api/src/redemptions/redemptions.service.spec.ts`
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/reactions/reactions.service.ts`
- Modify: `apps/api/src/comments/comments.service.ts`
- Modify: `apps/api/src/lib/auth.ts`

**Step 1: activity-types controller and service**

`activity-types.controller.ts`:
- Import `ClubService` from `../club/club.service` (was `FamilyService` from `../family/family.service`)
- `private familyService: FamilyService` → `private clubService: ClubService`
- All `this.familyService.getUserFamilyId` → `this.clubService.getUserClubId`
- All `familyId` local vars → `clubId`

`activity-types.service.ts`:
- All `familyId` parameter names and Prisma queries → `clubId`

`activity-types.service.spec.ts`:
- All `familyId` references → `clubId`
- Mock data: `'family-1'` → `'club-1'`

**Step 2: activity-logs controller and service**

`activity-logs.controller.ts`:
- Import `ClubService` from `../club/club.service`
- `private familyService: FamilyService` → `private clubService: ClubService`
- All `this.familyService.getUserFamilyId` → `this.clubService.getUserClubId`
- All `familyId` vars → `clubId`
- Error message: "family members" → "club members"

`activity-logs.service.ts`:
- `findFeed(familyId: string, ...)` → `findFeed(clubId: string, ...)`
- Prisma queries: `user: { familyId }` → `user: { clubId }`
- `user.familyId !== activityType.familyId` → `user.clubId !== activityType.clubId`
- All `familyId` params → `clubId`

`activity-logs.service.spec.ts`:
- All `familyId` in mock data → `clubId`
- All `'family-1'` → `'club-1'`

**Step 3: rewards controller and service**

`rewards.controller.ts`:
- All `familyId` vars → `clubId`
- `getFamilyIdForUser` → `getClubIdForUser`

`rewards.service.ts`:
- `getUserFamilyId` → `getUserClubId`
- `getFamilyIdForUser` → `getClubIdForUser`
- All `familyId` params, Prisma queries, error messages → `clubId`/`club`

**Step 4: leaderboard controller and service**

`leaderboard.controller.ts`:
- `this.leaderboardService.getUserFamilyId` → `this.leaderboardService.getUserClubId`
- `familyId` → `clubId`

`leaderboard.service.ts`:
- `getUserFamilyId` → `getUserClubId`
- `getRankings(familyId, ...)` → `getRankings(clubId, ...)`
- All Prisma `{ familyId }` queries → `{ clubId }`
- Error message: "family" → "club"

**Step 5: redemptions controller and service**

`redemptions.controller.ts`:
- `getFamilyIdForUser` → `getClubIdForUser`
- `familyId` → `clubId`

`redemptions.service.ts`:
- `getUserFamilyId` → `getUserClubId`
- `getFamilyIdForUser` → `getClubIdForUser`
- All `familyId` params, Prisma queries, error messages → `clubId`/`club`

`redemptions.service.spec.ts`:
- All `familyId` in mock data → `clubId`
- `'family-1'`, `'other-family'` → `'club-1'`, `'other-club'`

**Step 6: dashboard service**

`dashboard.service.ts`:
- `user.familyId` → `user.clubId`
- Select: `familyId: true` → `clubId: true`

**Step 7: auth service and spec**

`auth.service.ts`:
- `include: { family: true }` → `include: { club: true }`
- `user.familyId` → `user.clubId`
- `user.family` → `user.club`
- Response mapping: `familyId: user.familyId` → `clubId: user.clubId`
- Response: `family: user.family ? { ... }` → `club: user.club ? { ... }`

`auth.service.spec.ts`:
- All mock data: `familyId` → `clubId`, `family` → `club`
- Assertions: `result.familyId` → `result.clubId`, `result.family` → `result.club`

**Step 8: users service**

`users.service.ts`:
- Select/where: `familyId: true` → `clubId: true`
- Comparison: `requester.familyId !== target.familyId` → `requester.clubId !== target.clubId`
- Error: "family members" → "club members"

**Step 9: reactions and comments services**

`reactions.service.ts`:
- `user: { select: { familyId: true } }` → `user: { select: { clubId: true } }`
- `requester.familyId !== log.user.familyId` → `requester.clubId !== log.user.clubId`
- Error: "same family" → "same club"

`comments.service.ts`:
- Same pattern as reactions: `familyId` → `clubId`, error message update

**Step 10: BetterAuth config**

`apps/api/src/lib/auth.ts`:
- `additionalFields.familyId` → `additionalFields.clubId`

**Step 11: Update seed data**

`apps/api/prisma/seed.ts`:
- `prisma.family` → `prisma.club`
- `name: 'The Smiths'` → `name: 'Smith Fitness Club'`
- All `familyId: family.id` → `clubId: club.id`
- Variable name: `family` → `club`

**Step 12: Build and run all API tests**

Run: `cd apps/api && pnpm build`
Expected: Clean compile.

Run: `cd apps/api && npx jest --verbose`
Expected: All tests pass.

**Step 13: Commit**

```bash
git add apps/api/src/ apps/api/prisma/seed.ts
git commit -m "refactor: rename familyId to clubId across all API services and tests"
```

---

### Task 6: Frontend — Rename Pages, Routes, and UI Text

**Files:**
- Delete + Create: `apps/web/src/app/(app)/setup-family/` → `apps/web/src/app/(app)/setup-club/`
- Delete + Create: `apps/web/src/app/(app)/create-family/` → `apps/web/src/app/(app)/create-club/`
- Delete + Create: `apps/web/src/app/(app)/join-family/` → `apps/web/src/app/(app)/join-club/`
- Modify: `apps/web/src/app/(app)/layout.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/admin/members/page.tsx`
- Modify: `apps/web/src/app/(app)/leaderboard/page.tsx`
- Modify: `apps/web/src/app/(auth)/register/page.tsx`
- Modify: `apps/web/src/app/(auth)/join/[code]/page.tsx`
- Modify: `apps/web/src/lib/auth-context.tsx`
- Modify: `apps/web/src/components/ProfileView.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/public/manifest.json`

**Step 1: Create new page directories with updated content**

`apps/web/src/app/(app)/setup-club/page.tsx`:
- Copy from setup-family/page.tsx
- All "family" → "club" in text: "Create a Club", "Join a Club", etc.
- Routes: `/create-family` → `/create-club`, `/join-family` → `/join-club`

`apps/web/src/app/(app)/create-club/page.tsx`:
- Copy from create-family/page.tsx
- Import `ClubResponse` instead of `FamilyResponse`
- API: `'/family'` → `'/club'`
- All UI text: "Family" → "Club", "family" → "club"
- Placeholder: "e.g. The Smiths" → "e.g. Smith Fitness Club"
- Label: "Family Name" → "Club Name"
- Route: `/join-family` → `/join-club`

`apps/web/src/app/(app)/join-club/page.tsx`:
- Copy from join-family/page.tsx
- Import `ClubResponse` instead of `FamilyResponse`
- API: `'/family/join'` → `'/club/join'`
- All UI text: "family" → "club"
- Route: `/create-family` → `/create-club`

**Step 2: Delete old page directories**

```bash
rm -rf apps/web/src/app/\(app\)/setup-family/
rm -rf apps/web/src/app/\(app\)/create-family/
rm -rf apps/web/src/app/\(app\)/join-family/
```

**Step 3: Update layout.tsx**

`apps/web/src/app/(app)/layout.tsx`:
- `FAMILY_SETUP_PATHS` → `CLUB_SETUP_PATHS`
- Paths: `/create-family` → `/create-club`, `/join-family` → `/join-club`, `/setup-family` → `/setup-club`
- `user.familyId` → `user.clubId`
- `router.push('/setup-family')` → `router.push('/setup-club')`

**Step 4: Update auth-context.tsx**

`apps/web/src/lib/auth-context.tsx`:
- Comment: "familyId" → "clubId"
- `ExtendedSessionUser.familyId` → `ExtendedSessionUser.clubId`
- `familyId: sessionUser.familyId ?? null` → `clubId: sessionUser.clubId ?? null`

**Step 5: Update dashboard page**

`apps/web/src/app/(app)/dashboard/page.tsx`:
- `user.familyId` checks → `user.clubId`
- Text: "part of a family" → "part of a club"
- Button: "Create a Family" → "Create a Club", "Join a Family" → "Join a Club"
- Routes: `/create-family` → `/create-club`, `/join-family` → `/join-club`

**Step 6: Update admin members page**

`apps/web/src/app/(app)/admin/members/page.tsx`:
- Import `ClubResponse` instead of `FamilyResponse`
- `FamilyResponse` type → `ClubResponse`
- API URLs: `'/family'` → `'/club'`, `'/family/members'` → `'/club/members'`, etc.
- State: `family` variable can stay as-is or rename to `club`
- UI text: "Family Members" → "Club Members", "family data" → "club data", "from the family" → "from the club"

**Step 7: Update leaderboard page**

`apps/web/src/app/(app)/leaderboard/page.tsx`:
- "Family Activity Feed" → "Club Activity Feed"
- "No recent family activity." → "No recent club activity."

**Step 8: Update register page**

`apps/web/src/app/(auth)/register/page.tsx`:
- API: `'/family/join'` → `'/club/join'`
- Route: `/setup-family` → `/setup-club`
- Placeholder: "Optional — join an existing family" → "Optional — join an existing club"

**Step 9: Update join/[code] page**

`apps/web/src/app/(auth)/join/[code]/page.tsx`:
- API: `'/family/join'` → `'/club/join'`
- Title: "Join a family" → "Join a club"

**Step 10: Update ProfileView**

`apps/web/src/components/ProfileView.tsx`:
- Error message: "family members" → "club members"

**Step 11: Update root layout metadata**

`apps/web/src/app/layout.tsx`:
- `title: 'Fitsy — Family Fitness Tracker'` → `title: 'Fitsy — Fitness Club Tracker'`
- `description` update: "family" → "club"

**Step 12: Update PWA manifest**

`apps/web/public/manifest.json`:
- `"name": "Fitsy — Family Fitness Tracker"` → `"Fitsy — Fitness Club Tracker"`
- `"description": "...with your family"` → `"...with your club"`

**Step 13: Build web to verify**

Run: `cd apps/web && pnpm build`
Expected: Clean build, no errors.

**Step 14: Commit**

```bash
git add apps/web/
git commit -m "refactor: rename Family to Club across all frontend pages and UI text"
```

---

### Task 7: Verification and Cleanup

**Step 1: Search for any remaining "family" references**

Run: `grep -ri "family" --include="*.ts" --include="*.tsx" --include="*.json" apps/ packages/ | grep -v node_modules | grep -v .next | grep -v dist | grep -v migrations`

Any remaining hits (besides migration SQL files and maybe docs) should be addressed.

**Step 2: Run full test suite**

Run: `cd apps/api && npx jest --verbose`
Expected: All tests pass.

**Step 3: Start both services and smoke test**

Run: API and Web dev servers. Test:
1. Register a new user → redirected to `/setup-club`
2. Create a club → redirected to dashboard
3. Copy invite code → another user joins
4. All admin pages work (members, activities, rewards)
5. Mobile hamburger menu → all items visible above bottom nav

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final cleanup after Family→Club rename"
```
