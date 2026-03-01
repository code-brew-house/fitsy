# BetterAuth Migration & Backend Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace custom JWT auth with BetterAuth (session-based) and fix backend performance/data integrity issues.

**Architecture:** Mount BetterAuth via `toNodeHandler()` in NestJS main.ts before body parser. Create a custom `BetterAuthGuard` that validates sessions via `auth.api.getSession()`. Frontend uses `createAuthClient()` from `better-auth/react` with cookie-based sessions. Performance fixes add 8 missing DB indexes, fix N+1 queries, and patch a redemption race condition.

**Tech Stack:** BetterAuth, Prisma 6, PostgreSQL 16, NestJS 11, Next.js 15, Mantine UI v7

**Important context:**
- This is a **fresh start** — no user migration needed, DB can be wiped
- All 10 controllers use `@UseGuards(JwtAuthGuard)` at the class level and access `req.user.userId`
- BetterAuth session user has `.id` (not `.userId`) — every `req.user.userId` becomes `req.user.id`
- BetterAuth expects lowercase table names (`@@map("user")`)
- The NestJS project uses CommonJS — BetterAuth ships with CJS fallbacks so this should work

---

## Task 1: Install dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`

**Step 1: Install BetterAuth on API**

Run:
```bash
cd apps/api && pnpm add better-auth && pnpm remove @nestjs/jwt @nestjs/passport passport passport-jwt class-validator class-transformer bcrypt
```

**Step 2: Remove unused type packages**

Run:
```bash
cd apps/api && pnpm remove @types/passport-jwt @types/bcrypt
```

**Step 3: Install BetterAuth on Web**

Run:
```bash
cd apps/web && pnpm add better-auth
```

**Step 4: Commit**

```bash
git add apps/api/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add better-auth, remove jwt/passport/bcrypt deps"
```

---

## Task 2: Update Prisma schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Rewrite the Prisma schema**

Replace `apps/api/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEMBER
}

enum MeasurementType {
  DISTANCE
  EFFORT
  FLAT
  DURATION
}

enum EffortLevel {
  LOW
  MEDIUM
  HIGH
  EXTREME
}

enum RedemptionStatus {
  PENDING
  FULFILLED
  CANCELLED
}

// === BetterAuth tables ===

model User {
  id            String    @id
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // App-specific fields
  role          Role      @default(MEMBER)
  familyId      String?
  family        Family?   @relation(fields: [familyId], references: [id])
  totalPoints   Int       @default(0)

  // BetterAuth relations
  sessions      Session[]
  accounts      Account[]

  // App relations
  activityLogs  ActivityLog[]
  redemptions   Redemption[]
  comments      Comment[]
  reactions     Reaction[]

  @@index([familyId])
  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@map("verification")
}

// === App tables ===

model Family {
  id            String         @id @default(uuid())
  name          String
  inviteCode    String         @unique
  createdAt     DateTime       @default(now())
  users         User[]
  activityTypes ActivityType[]
  rewards       Reward[]
}

model ActivityType {
  id              String          @id @default(uuid())
  familyId        String
  family          Family          @relation(fields: [familyId], references: [id])
  name            String
  icon            String
  measurementType MeasurementType
  pointsPerUnit   Float?
  unit            String?
  pointsLow       Int?
  pointsMedium    Int?
  pointsHigh      Int?
  pointsExtreme   Int?
  flatPoints      Int?
  pointsPerMinute Float?
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  activityLogs    ActivityLog[]

  @@index([familyId])
}

model ActivityLog {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  activityTypeId  String
  activityType    ActivityType    @relation(fields: [activityTypeId], references: [id])
  measurementType MeasurementType
  distanceKm      Float?
  effortLevel     EffortLevel?
  durationMinutes Int?
  pointsEarned    Int
  note            String?
  createdAt       DateTime        @default(now())
  comments        Comment[]
  reactions       Reaction[]

  @@index([userId, createdAt])
  @@index([activityTypeId])
}

model Comment {
  id            String      @id @default(uuid())
  activityLogId String
  activityLog   ActivityLog @relation(fields: [activityLogId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  text          String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([activityLogId])
}

model Reaction {
  id            String      @id @default(uuid())
  activityLogId String
  activityLog   ActivityLog @relation(fields: [activityLogId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  emoji         String
  createdAt     DateTime    @default(now())

  @@unique([activityLogId, userId, emoji])
  @@index([activityLogId])
}

model Reward {
  id          String       @id @default(uuid())
  familyId    String
  family      Family       @relation(fields: [familyId], references: [id])
  name        String
  description String
  imageUrl    String?
  pointCost   Int
  quantity    Int?
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  redemptions Redemption[]

  @@index([familyId])
}

model Redemption {
  id          String           @id @default(uuid())
  userId      String
  user        User             @relation(fields: [userId], references: [id])
  rewardId    String
  reward      Reward           @relation(fields: [rewardId], references: [id])
  pointsSpent Int
  status      RedemptionStatus @default(PENDING)
  createdAt   DateTime         @default(now())

  @@index([userId, status])
}
```

**Key changes from original:**
- User model: removed `passwordHash`, added `emailVerified`, `image`, `updatedAt`, `sessions[]`, `accounts[]`, `@@map("user")`
- Added BetterAuth tables: `Session`, `Account`, `Verification` with `@@map()` directives
- Added 8 indexes: `User(familyId)`, `ActivityType(familyId)`, `ActivityLog(userId, createdAt)`, `ActivityLog(activityTypeId)`, `Comment(activityLogId)`, `Reaction(activityLogId)`, `Reward(familyId)`, `Redemption(userId, status)`
- User `id` no longer uses `@default(uuid())` — BetterAuth generates IDs

**Step 2: Reset database and create fresh migration**

Run:
```bash
cd apps/api && npx prisma migrate reset --force && npx prisma migrate dev --name "betterauth-schema"
```

**Step 3: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: update schema for BetterAuth + add database indexes"
```

---

## Task 3: Create BetterAuth server instance

**Files:**
- Create: `apps/api/src/lib/auth.ts`

**Step 1: Create the auth config file**

Create `apps/api/src/lib/auth.ts`:

```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'MEMBER',
        input: false,
      },
      familyId: {
        type: 'string',
        required: false,
        input: false,
      },
      totalPoints: {
        type: 'number',
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh every 24 hours
  },

  trustedOrigins: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
  ],
});

export type Auth = typeof auth;
```

**Step 2: Verify it compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit src/lib/auth.ts 2>&1 | head -20
```

If there are ESM/CJS import issues, try wrapping in dynamic import. See Troubleshooting section at the end.

**Step 3: Commit**

```bash
git add apps/api/src/lib/auth.ts
git commit -m "feat: create BetterAuth server instance config"
```

---

## Task 4: Create BetterAuthGuard and update RolesGuard

**Files:**
- Create: `apps/api/src/auth/better-auth.guard.ts`
- Modify: `apps/api/src/auth/roles.guard.ts`

**Step 1: Create the BetterAuth guard**

Create `apps/api/src/auth/better-auth.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Populate req.user with the session user data
    // Use 'id' to match BetterAuth's user shape
    request.user = session.user;
    request.session = session.session;

    return true;
  }
}
```

**Step 2: Update RolesGuard to use `request.user.id` instead of `request.user.userId`**

Modify `apps/api/src/auth/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@fitsy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
    });
    if (!user) return false;

    return requiredRoles.includes(user.role as Role);
  }
}
```

**Change:** Line 23: `request.user.userId` → `request.user.id`

**Step 3: Commit**

```bash
git add apps/api/src/auth/better-auth.guard.ts apps/api/src/auth/roles.guard.ts
git commit -m "feat: add BetterAuthGuard, update RolesGuard for session user"
```

---

## Task 5: Update main.ts to mount BetterAuth

**Files:**
- Modify: `apps/api/src/main.ts`

**Step 1: Rewrite main.ts**

Replace `apps/api/src/main.ts` with:

```typescript
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();

  // Mount BetterAuth BEFORE NestJS body parser
  server.all('/api/auth/*', toNodeHandler(auth));

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { bodyParser: false },
  );

  // Re-enable body parsing for NestJS routes
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT || 4000);
}

bootstrap();
```

**Key changes:**
- Create raw Express instance, mount BetterAuth on `/api/auth/*`
- Use `ExpressAdapter` with `bodyParser: false` to let BetterAuth handle raw request bodies
- Re-enable body parser for all other NestJS routes
- Changed default port from 3000 to 4000 (matches actual dev setup)

**Step 2: Verify compilation**

Run:
```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

Fix any import issues. If `express` default import fails, use `import * as express from 'express'`.

**Step 3: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat: mount BetterAuth handler in main.ts bootstrap"
```

---

## Task 6: Rewrite auth module, service, and controller

**Files:**
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Delete: `apps/api/src/auth/jwt.strategy.ts`
- Delete: `apps/api/src/auth/jwt-auth.guard.ts`

**Step 1: Rewrite auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

**Changes:** Removed `PassportModule`, `JwtModule`, `JwtStrategy` imports.

**Step 2: Rewrite auth.service.ts**

BetterAuth handles register/login. The service now only needs `getMe`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.image,
      role: user.role,
      familyId: user.familyId,
      totalPoints: user.totalPoints,
      createdAt: user.createdAt.toISOString(),
      family: user.family
        ? {
            id: user.family.id,
            name: user.family.name,
            inviteCode: user.family.inviteCode,
            createdAt: user.family.createdAt.toISOString(),
          }
        : null,
    };
  }
}
```

**Changes:** Removed register/login methods (BetterAuth handles), removed JwtService/bcrypt imports, mapped `user.image` → `avatarUrl` for backward compat.

**Step 3: Rewrite auth.controller.ts**

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BetterAuthGuard } from './better-auth.guard';

@UseGuards(BetterAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
```

**Changes:** Removed register/login endpoints (BetterAuth handles via `/api/auth/*`), switched to `BetterAuthGuard`, `req.user.id` instead of `req.user.userId`.

**Step 4: Delete JWT files**

Run:
```bash
rm apps/api/src/auth/jwt.strategy.ts apps/api/src/auth/jwt-auth.guard.ts
```

**Step 5: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat: rewrite auth module for BetterAuth, remove JWT"
```

---

## Task 7: Update all controllers — replace JwtAuthGuard with BetterAuthGuard

All 9 controllers (excluding auth, already done) import `JwtAuthGuard` and use `req.user.userId`. Both need updating.

**Files:**
- Modify: `apps/api/src/activity-logs/activity-logs.controller.ts`
- Modify: `apps/api/src/activity-types/activity-types.controller.ts`
- Modify: `apps/api/src/comments/comments.controller.ts`
- Modify: `apps/api/src/reactions/reactions.controller.ts`
- Modify: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/leaderboard/leaderboard.controller.ts`
- Modify: `apps/api/src/family/family.controller.ts`
- Modify: `apps/api/src/rewards/rewards.controller.ts`
- Modify: `apps/api/src/redemptions/redemptions.controller.ts`

**For each controller, make these two changes:**

1. Replace import:
   ```typescript
   // OLD
   import { JwtAuthGuard } from '../auth/jwt-auth.guard';
   // NEW
   import { BetterAuthGuard } from '../auth/better-auth.guard';
   ```

2. Replace guard usage:
   ```typescript
   // OLD
   @UseGuards(JwtAuthGuard)
   // NEW
   @UseGuards(BetterAuthGuard)
   ```

3. Replace all `req.user.userId` with `req.user.id` throughout each file.

**Step 1: Update all 9 controllers**

Use find-and-replace across these files:
- `JwtAuthGuard` → `BetterAuthGuard`
- `'../auth/jwt-auth.guard'` → `'../auth/better-auth.guard'`
- `req.user.userId` → `req.user.id`

**Step 2: Verify compilation**

Run:
```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors (or only ESM-related warnings that don't affect runtime).

**Step 3: Commit**

```bash
git add apps/api/src/
git commit -m "feat: replace JwtAuthGuard with BetterAuthGuard in all controllers"
```

---

## Task 8: Fix N+1 query in activity feed

**Files:**
- Modify: `apps/api/src/activity-logs/activity-logs.service.ts:121-137`

**Step 1: Replace the `findFeed` method**

In `activity-logs.service.ts`, replace the `findFeed` method (lines 121-159):

```typescript
  async findFeed(familyId: string, userId: string, limit: number = 20) {
    const logs = await this.prisma.activityLog.findMany({
      where: { user: { familyId } },
      include: {
        activityType: { select: { name: true, icon: true } },
        user: { select: { name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const logIds = logs.map((l) => l.id);
    const reactionSummaries = await this.reactionsService.getReactionSummariesForLogs(logIds, userId);

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      activityTypeId: log.activityTypeId,
      activityTypeName: log.activityType.name,
      activityTypeIcon: log.activityType.icon,
      measurementType: log.measurementType,
      distanceKm: log.distanceKm,
      effortLevel: log.effortLevel,
      durationMinutes: log.durationMinutes,
      pointsEarned: log.pointsEarned,
      note: log.note ?? null,
      commentCount: log._count.comments,
      reactions: reactionSummaries[log.id] || [],
      createdAt: log.createdAt.toISOString(),
    }));
  }
```

**Change:** Replaced 2-query pattern (fetch users then logs by user IDs) with single query using Prisma relation filter `{ user: { familyId } }`.

**Step 2: Commit**

```bash
git add apps/api/src/activity-logs/activity-logs.service.ts
git commit -m "fix: eliminate N+1 query in activity feed"
```

---

## Task 9: Fix redemption race condition

**Files:**
- Modify: `apps/api/src/redemptions/redemptions.service.ts:55-60`

**Step 1: Replace the reward quantity decrement**

In `redemptions.service.ts`, replace lines 55-60 (inside the `create` transaction):

```typescript
      if (reward.quantity !== null) {
        const updated = await tx.reward.updateMany({
          where: { id: dto.rewardId, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });
        if (updated.count === 0) {
          throw new BadRequestException('Reward out of stock');
        }
      }
```

**Change:** Replaced `reward.update` with `reward.updateMany` using a `where` clause that includes `quantity: { gt: 0 }`. This prevents the race condition — if two concurrent requests both pass the initial `quantity > 0` check, only one will succeed at the `updateMany` level because the `where` clause is evaluated atomically within the transaction.

**Step 2: Commit**

```bash
git add apps/api/src/redemptions/redemptions.service.ts
git commit -m "fix: prevent redemption race condition with optimistic locking"
```

---

## Task 10: Optimize leaderboard for all-time period

**Files:**
- Modify: `apps/api/src/leaderboard/leaderboard.service.ts:20-88`

**Step 1: Add early return for all-time period**

In `leaderboard.service.ts`, replace the `getRankings` method:

```typescript
  async getRankings(
    familyId: string,
    period: 'week' | 'month' | 'alltime',
  ): Promise<LeaderboardEntry[]> {
    // For all-time, use the pre-computed totalPoints on User
    if (period === 'alltime') {
      const members = await this.prisma.user.findMany({
        where: { familyId },
        select: { id: true, name: true, image: true, totalPoints: true },
        orderBy: { totalPoints: 'desc' },
      });
      return members.map((m) => ({
        userId: m.id,
        userName: m.name,
        avatarUrl: m.image,
        totalPoints: m.totalPoints,
        activityCount: 0, // Not tracked for all-time shortcut
      }));
    }

    const now = new Date();
    const dateFilter =
      period === 'week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const familyMembers = await this.prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, image: true },
    });

    if (familyMembers.length === 0) return [];

    const memberIds = familyMembers.map((m) => m.id);

    const aggregations = await this.prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: memberIds },
        createdAt: { gte: dateFilter },
      },
      _sum: { pointsEarned: true },
      _count: { id: true },
    });

    const aggMap = new Map(
      aggregations.map((a) => [
        a.userId,
        {
          totalPoints: a._sum.pointsEarned || 0,
          activityCount: a._count.id,
        },
      ]),
    );

    const entries: LeaderboardEntry[] = familyMembers.map((member) => {
      const agg = aggMap.get(member.id);
      return {
        userId: member.id,
        userName: member.name,
        avatarUrl: member.image,
        totalPoints: agg?.totalPoints ?? 0,
        activityCount: agg?.activityCount ?? 0,
      };
    });

    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    return entries;
  }
```

**Changes:**
- Added all-time shortcut using `User.totalPoints` (no aggregation needed)
- Changed `avatarUrl: member.avatarUrl` → `avatarUrl: member.image` (BetterAuth field name)
- Simplified week/month date filter logic

**Step 2: Commit**

```bash
git add apps/api/src/leaderboard/leaderboard.service.ts
git commit -m "perf: use User.totalPoints for all-time leaderboard"
```

---

## Task 11: Fix invite code entropy + streak calculation

**Files:**
- Modify: `apps/api/src/family/family.service.ts:20-22` (invite code)
- Modify: `apps/api/src/dashboard/dashboard.service.ts:84-87` (streak already has orderBy — verify)

**Step 1: Increase invite code entropy**

In `family.service.ts`, change line 21:

```typescript
// OLD
return randomBytes(4).toString('hex').toUpperCase();
// NEW
return randomBytes(8).toString('hex').toUpperCase();
```

This doubles entropy from 32-bit to 64-bit (16 hex chars instead of 8).

**Step 2: Verify streak calculation**

Read `dashboard.service.ts:84-87`. The streak query already has `orderBy: { createdAt: 'desc' }` (line 87). However, it still sorts in JavaScript on line 103. Remove the redundant JS sort since dates are already ordered.

In `dashboard.service.ts`, delete line 103:
```typescript
// DELETE this line:
uniqueDates.sort((a, b) => b.localeCompare(a));
```

The `Set` preserves insertion order, and since logs come ordered `desc` from Prisma, unique dates are already in descending order.

**Step 3: Commit**

```bash
git add apps/api/src/family/family.service.ts apps/api/src/dashboard/dashboard.service.ts
git commit -m "fix: increase invite code entropy, remove redundant streak sort"
```

---

## Task 12: Update remaining services for User field rename (avatarUrl → image)

Any service that reads `user.avatarUrl` needs to read `user.image` instead. Check these services:

**Files:**
- Modify: `apps/api/src/family/family.service.ts:103-116` (getMembers selects `avatarUrl`)
- Modify: `apps/api/src/leaderboard/leaderboard.service.ts` (already done in Task 10)

**Step 1: Update family.service.ts getMembers**

In `family.service.ts`, change the `getMembers` method select (line 111):

```typescript
// OLD
avatarUrl: true,
// NEW
image: true,
```

And map the response to preserve the `avatarUrl` field name in the API response if needed, or update the shared types to use `image`.

**Step 2: Commit**

```bash
git add apps/api/src/family/family.service.ts
git commit -m "fix: update user field references for BetterAuth schema"
```

---

## Task 13: Update shared package types and schemas

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/schemas.ts`

**Step 1: Update UserResponse type**

In `types.ts`, update the `UserResponse` interface:

```typescript
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;  // maps from user.image
  role: Role;
  familyId: string | null;
  totalPoints: number;
  createdAt: string;
}
```

Keep `avatarUrl` in the API response type for frontend backward compatibility — the service layer maps `user.image` → `avatarUrl`.

**Step 2: Update AuthResponse**

Remove `accessToken` from `AuthResponse` since BetterAuth uses cookies, not tokens:

```typescript
// DELETE AuthResponse entirely — no longer needed
// BetterAuth handles auth responses via its own endpoints
```

Or keep it but mark it as deprecated. Since the frontend will use BetterAuth's client directly, `AuthResponse` is unused.

**Step 3: Remove auth schemas from shared**

In `schemas.ts`, remove the `registerSchema` and `loginSchema` since BetterAuth handles validation:

```typescript
// DELETE these lines:
// export const registerSchema = z.object({ ... });
// export const loginSchema = z.object({ ... });
```

Also remove the corresponding type exports from `types.ts`:

```typescript
// DELETE:
// export type RegisterDto = z.infer<typeof schemas.registerSchema>;
// export type LoginDto = z.infer<typeof schemas.loginSchema>;
// export type AuthResponse = { ... };
```

**Step 4: Commit**

```bash
git add packages/shared/
git commit -m "chore: update shared types for BetterAuth, remove auth schemas"
```

---

## Task 14: Create BetterAuth client for frontend

**Files:**
- Create: `apps/web/src/lib/auth-client.ts`

**Step 1: Create auth client**

Create `apps/web/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/auth-client.ts
git commit -m "feat: create BetterAuth client for frontend"
```

---

## Task 15: Rewrite auth context

**Files:**
- Modify: `apps/web/src/lib/auth-context.tsx`

**Step 1: Rewrite auth-context.tsx to use BetterAuth**

```typescript
'use client';

import { createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from './auth-client';
import { api } from './api';
import type { UserResponse } from '@fitsy/shared';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const logout = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    // BetterAuth's useSession automatically refreshes
    // This is a no-op kept for backward compatibility
  }, []);

  // Map BetterAuth session user to our UserResponse shape
  const user: UserResponse | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.image ?? null,
        role: (session.user as any).role ?? 'MEMBER',
        familyId: (session.user as any).familyId ?? null,
        totalPoints: (session.user as any).totalPoints ?? 0,
        createdAt: session.user.createdAt?.toString() ?? new Date().toISOString(),
      }
    : null;

  return (
    <AuthContext.Provider value={{ user, loading: isPending, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Changes:**
- Uses `useSession()` from BetterAuth client instead of manual token/state management
- Removed `login`/`register` methods (pages call BetterAuth client directly)
- Maps BetterAuth user shape → `UserResponse` for backward compat
- `refreshUser` is a no-op (BetterAuth manages session refresh)

**Step 2: Commit**

```bash
git add apps/web/src/lib/auth-context.tsx
git commit -m "feat: rewrite auth context to use BetterAuth session"
```

---

## Task 16: Update API client — remove token management

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Simplify api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include', // Send session cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

**Changes:** Removed `token` property, `setToken()`, `getToken()`, localStorage usage, `Authorization` header. Added `credentials: 'include'` so cookies are sent with every request.

**Step 2: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat: simplify API client to use cookies instead of Bearer tokens"
```

---

## Task 17: Rewrite login and register pages

**Files:**
- Modify: `apps/web/src/app/(auth)/login/page.tsx`
- Modify: `apps/web/src/app/(auth)/register/page.tsx`

**Step 1: Rewrite login page**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { signIn } from '../../../lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length > 0 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        throw new Error(error.message || 'Login failed');
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
      <Title ta="center" mb={4}>
        Welcome back
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Don&apos;t have an account?{' '}
        <Anchor size="sm" href="/register">
          Register
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Sign in
          </Button>
        </form>
      </Paper>
    </>
  );
}
```

**Change:** Replaced `useAuth().login()` with `signIn.email()` from BetterAuth client.

**Step 2: Rewrite register page**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { signUp } from '../../../lib/auth-client';
import { api } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      inviteCode: '',
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
      const { error } = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (error) {
        throw new Error(error.message || 'Registration failed');
      }
      // If invite code provided, join family after registration
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
        Create your account
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
            placeholder="Optional — join an existing family"
            mt="md"
            {...form.getInputProps('inviteCode')}
          />
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Create account
          </Button>
        </form>
      </Paper>
    </>
  );
}
```

**Changes:** Replaced `useAuth().register()` with `signUp.email()` from BetterAuth, then joins family via API call if invite code provided.

**Step 3: Commit**

```bash
git add apps/web/src/app/(auth)/
git commit -m "feat: rewrite login/register pages to use BetterAuth client"
```

---

## Task 18: Update app layout

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Step 1: Update layout to use useAuth (no changes needed)**

The current layout uses `useAuth()` which still works with the rewritten auth context. No changes needed unless `useSession` is preferred.

Verify by reading the file — if it only uses `user` and `loading` from `useAuth()`, it should work as-is.

**Step 2: Commit (if changed)**

```bash
# Only if changes were needed
git add apps/web/src/app/(app)/layout.tsx
git commit -m "chore: verify app layout works with BetterAuth"
```

---

## Task 19: Update seed script

**Files:**
- Modify: `apps/api/prisma/seed.ts`

**Step 1: Check if seed script creates users**

Read the seed file. If it creates users with `passwordHash`, it needs to be updated to use BetterAuth's API or create users through the `account` table.

For a fresh start, the simplest approach is to use BetterAuth's admin API to create test users, or directly insert into the `user` and `account` tables.

Update the seed to create users via direct Prisma inserts matching BetterAuth's schema:

```typescript
// Create user
const user = await prisma.user.create({
  data: {
    id: crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: false,
    role: 'ADMIN',
  },
});

// Create account with password (BetterAuth uses scrypt by default)
// For seeding, use BetterAuth's password hashing:
import { auth } from '../src/lib/auth';
const ctx = await auth.api.signUpEmail({
  body: { name: 'Test User', email: 'test@example.com', password: 'password123' },
});
```

**Step 2: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "chore: update seed script for BetterAuth schema"
```

---

## Task 20: Update environment variables

**Files:**
- Modify: `apps/api/.env` (or `.env.example`)

**Step 1: Add BetterAuth env vars**

```env
# BetterAuth (replaces JWT_SECRET)
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:4000

# Remove:
# JWT_SECRET=...
```

**Step 2: Commit**

```bash
git add apps/api/.env.example
git commit -m "chore: update env vars for BetterAuth"
```

---

## Task 21: Smoke test the full stack

**Step 1: Start the API**

```bash
cd apps/api && pnpm dev
```

Watch for startup errors. Common issues:
- ESM import errors → see Troubleshooting
- Missing BetterAuth tables → re-run `prisma migrate dev`

**Step 2: Test BetterAuth endpoints**

```bash
# Register
curl -X POST http://localhost:4000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}' \
  -c cookies.txt -v

# Login
curl -X POST http://localhost:4000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt -v

# Get session
curl http://localhost:4000/api/auth/get-session \
  -b cookies.txt -v

# Test protected endpoint
curl http://localhost:4000/auth/me \
  -b cookies.txt -v
```

**Step 3: Start the frontend and test login flow**

```bash
cd apps/web && pnpm dev
```

Navigate to `http://localhost:3000/register`, create account, verify redirect to dashboard.

**Step 4: Fix any issues found during testing**

---

## Task 22: Update unit tests

**Files:**
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: any other spec files that mock JwtAuthGuard or JwtService

**Step 1: Update auth.service.spec.ts**

Remove JWT-related test cases (register, login). Keep only `getMe` tests. Remove `JwtService` mock.

**Step 2: Update other spec files**

Search for `JwtAuthGuard` or `JwtService` in spec files and update mocks:

```bash
grep -rl 'JwtAuthGuard\|JwtService' apps/api/src --include='*.spec.ts'
```

**Step 3: Run tests**

```bash
cd apps/api && pnpm test
```

Fix any failures.

**Step 4: Commit**

```bash
git add apps/api/src/
git commit -m "test: update unit tests for BetterAuth migration"
```

---

## Troubleshooting

### ESM/CJS Import Issues

If `import { betterAuth } from 'better-auth'` fails in the CommonJS NestJS project:

**Option A**: Use dynamic import in `apps/api/src/lib/auth.ts`:
```typescript
let auth: any;

export async function getAuth() {
  if (!auth) {
    const { betterAuth } = await import('better-auth');
    const { prismaAdapter } = await import('better-auth/adapters/prisma');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    auth = betterAuth({ /* config */ });
  }
  return auth;
}
```

**Option B**: Switch NestJS to ESM by changing `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```
And add `"type": "module"` to `apps/api/package.json`.

### Express Wildcard Route

If Express v5 is used (NestJS 11 may use Express 5), change the wildcard:
```typescript
// Express v4
server.all('/api/auth/*', toNodeHandler(auth));
// Express v5
server.all('/api/auth/*splat', toNodeHandler(auth));
```

### Cookie Not Being Set

If session cookies aren't sent cross-origin:
1. Verify `trustedOrigins` includes frontend URL
2. Verify frontend sends `credentials: 'include'`
3. Verify API `enableCors` has `credentials: true`
4. In dev, both must be on `localhost` (not `127.0.0.1` vs `localhost`)
