# Fitsy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a family fitness habit tracker PWA with configurable activities, point system, and reward redemption.

**Architecture:** Turborepo monorepo with Next.js 15 (Mantine UI) frontend, NestJS backend, PostgreSQL + Prisma. Shared package for types and Zod schemas. Docker Compose for local dev, Dokploy for production.

**Tech Stack:** TypeScript, Next.js 15 (App Router), Mantine UI v7, NestJS, Prisma, PostgreSQL 16, Turborepo, Zod, JWT (passport-jwt), Docker, pnpm

**Design Doc:** `docs/plans/2026-02-28-fitsy-design.md`

---

## Phase 1: Monorepo Scaffolding

### Task 1: Initialize Turborepo monorepo

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.nvmrc`

**Step 1: Create root package.json**

```json
{
  "name": "fitsy",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:seed": "turbo run db:seed"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
.turbo/
dist/
.next/
.env
.env.local
*.log
```

**Step 5: Create .nvmrc**

```
20
```

**Step 6: Install dependencies and commit**

```bash
pnpm install
git add -A
git commit -m "chore: initialize Turborepo monorepo"
```

---

### Task 2: Create shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/types.ts`

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@fitsy/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/shared/src/enums.ts**

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MeasurementType {
  DISTANCE = 'DISTANCE',
  EFFORT = 'EFFORT',
  FLAT = 'FLAT',
  DURATION = 'DURATION',
}

export enum EffortLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EXTREME = 'EXTREME',
}

export enum RedemptionStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}
```

**Step 4: Create packages/shared/src/schemas.ts**

Define Zod schemas for all API request/response validation:

```typescript
import { z } from 'zod';
import { MeasurementType, EffortLevel, RedemptionStatus, Role } from './enums';

// Auth
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  inviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Family
export const createFamilySchema = z.object({
  name: z.string().min(1).max(100),
});

export const joinFamilySchema = z.object({
  inviteCode: z.string().min(1),
});

export const updateFamilySchema = z.object({
  name: z.string().min(1).max(100),
});

// Activity Types
export const createActivityTypeSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1).max(10),
  measurementType: z.nativeEnum(MeasurementType),
  pointsPerUnit: z.number().positive().optional(),
  unit: z.string().optional(),
  pointsLow: z.number().int().positive().optional(),
  pointsMedium: z.number().int().positive().optional(),
  pointsHigh: z.number().int().positive().optional(),
  pointsExtreme: z.number().int().positive().optional(),
  flatPoints: z.number().int().positive().optional(),
  pointsPerMinute: z.number().positive().optional(),
});

export const updateActivityTypeSchema = createActivityTypeSchema.partial();

// Activity Logs
export const createActivityLogSchema = z.object({
  activityTypeId: z.string().uuid(),
  distanceKm: z.number().positive().optional(),
  effortLevel: z.nativeEnum(EffortLevel).optional(),
  durationMinutes: z.number().int().positive().optional(),
});

// Rewards
export const createRewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
  pointCost: z.number().int().positive(),
  quantity: z.number().int().positive().optional(),
});

export const updateRewardSchema = createRewardSchema.partial();

// Redemptions
export const createRedemptionSchema = z.object({
  rewardId: z.string().uuid(),
});

// Leaderboard
export const leaderboardQuerySchema = z.object({
  period: z.enum(['week', 'month', 'alltime']).default('week'),
});
```

**Step 5: Create packages/shared/src/types.ts**

```typescript
import { z } from 'zod';
import * as schemas from './schemas';
import { Role, MeasurementType, EffortLevel, RedemptionStatus } from './enums';

// Request types (inferred from Zod schemas)
export type RegisterDto = z.infer<typeof schemas.registerSchema>;
export type LoginDto = z.infer<typeof schemas.loginSchema>;
export type CreateFamilyDto = z.infer<typeof schemas.createFamilySchema>;
export type JoinFamilyDto = z.infer<typeof schemas.joinFamilySchema>;
export type UpdateFamilyDto = z.infer<typeof schemas.updateFamilySchema>;
export type CreateActivityTypeDto = z.infer<typeof schemas.createActivityTypeSchema>;
export type UpdateActivityTypeDto = z.infer<typeof schemas.updateActivityTypeSchema>;
export type CreateActivityLogDto = z.infer<typeof schemas.createActivityLogSchema>;
export type CreateRewardDto = z.infer<typeof schemas.createRewardSchema>;
export type UpdateRewardDto = z.infer<typeof schemas.updateRewardSchema>;
export type CreateRedemptionDto = z.infer<typeof schemas.createRedemptionSchema>;
export type LeaderboardQuery = z.infer<typeof schemas.leaderboardQuerySchema>;

// Response types
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  familyId: string | null;
  totalPoints: number;
  createdAt: string;
}

export interface FamilyResponse {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface ActivityTypeResponse {
  id: string;
  name: string;
  icon: string;
  measurementType: MeasurementType;
  pointsPerUnit: number | null;
  unit: string | null;
  pointsLow: number | null;
  pointsMedium: number | null;
  pointsHigh: number | null;
  pointsExtreme: number | null;
  flatPoints: number | null;
  pointsPerMinute: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface ActivityLogResponse {
  id: string;
  userId: string;
  userName: string;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeIcon: string;
  measurementType: MeasurementType;
  distanceKm: number | null;
  effortLevel: EffortLevel | null;
  durationMinutes: number | null;
  pointsEarned: number;
  createdAt: string;
}

export interface RewardResponse {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  pointCost: number;
  quantity: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface RedemptionResponse {
  id: string;
  userId: string;
  userName: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  status: RedemptionStatus;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalPoints: number;
  activityCount: number;
}

export interface DashboardResponse {
  totalPoints: number;
  pointsThisWeek: number;
  activitiesThisWeek: number;
  currentStreak: number;
  recentActivities: ActivityLogResponse[];
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}
```

**Step 6: Create packages/shared/src/index.ts**

```typescript
export * from './enums';
export * from './schemas';
export * from './types';
```

**Step 7: Install and commit**

```bash
pnpm install
git add -A
git commit -m "feat: add shared package with types, enums, and Zod schemas"
```

---

## Phase 2: NestJS Backend Setup

### Task 3: Scaffold NestJS API app

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/.env`
- Create: `apps/api/.env.example`

**Step 1: Create apps/api/package.json**

```json
{
  "name": "@fitsy/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@fitsy/shared": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@prisma/client": "^6.0.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.0",
    "jest": "^29.7.0",
    "prisma": "^6.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.5.0"
  }
}
```

**Step 2: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*", "prisma/**/*"]
}
```

**Step 3: Create apps/api/tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

**Step 4: Create apps/api/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**Step 5: Create apps/api/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
```

**Step 6: Create apps/api/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

**Step 7: Create apps/api/.env.example and .env**

```env
DATABASE_URL=postgresql://fitsy:fitsy_dev@localhost:5432/fitsy
JWT_SECRET=dev-secret-change-in-production
CORS_ORIGIN=http://localhost:3000
PORT=4000
```

**Step 8: Install and commit**

```bash
pnpm install
git add -A
git commit -m "feat: scaffold NestJS API app"
```

---

### Task 4: Set up Prisma schema and database

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

**Step 1: Create apps/api/prisma/schema.prisma**

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

model Family {
  id            String         @id @default(uuid())
  name          String
  inviteCode    String         @unique
  createdAt     DateTime       @default(now())
  users         User[]
  activityTypes ActivityType[]
  rewards       Reward[]
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  name         String
  avatarUrl    String?
  role         Role          @default(MEMBER)
  familyId     String?
  family       Family?       @relation(fields: [familyId], references: [id])
  totalPoints  Int           @default(0)
  createdAt    DateTime      @default(now())
  activityLogs ActivityLog[]
  redemptions  Redemption[]
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
  createdAt       DateTime        @default(now())
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
}
```

**Step 2: Create apps/api/src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Step 3: Create apps/api/src/prisma/prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 4: Start Postgres, generate client, run migration**

```bash
# Start Postgres (Docker Compose will be created in Task 9)
# For now, use standalone container:
docker run -d --name fitsy-postgres -e POSTGRES_DB=fitsy -e POSTGRES_USER=fitsy -e POSTGRES_PASSWORD=fitsy_dev -p 5432:5432 postgres:16-alpine

cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

**Step 5: Verify migration ran successfully**

Run: `npx prisma studio`
Expected: Browser opens with all 5 tables visible (Family, User, ActivityType, ActivityLog, Reward, Redemption)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all models and initial migration"
```

---

### Task 5: Auth module (register, login, JWT)

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/roles.guard.ts`
- Create: `apps/api/src/auth/roles.decorator.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test for auth.service**

Create `apps/api/src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      family: {
        findUnique: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create a user and return auth response', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        avatarUrl: null,
        role: 'MEMBER',
        familyId: null,
        totalPoints: 0,
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'test@test.com', password: 'password123', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return auth response for valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hash,
        name: 'Test',
        avatarUrl: null,
        role: 'MEMBER',
        familyId: null,
        totalPoints: 0,
        createdAt: new Date(),
      });

      const result = await service.login({ email: 'test@test.com', password: 'password123' });
      expect(result.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hash,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && npx jest src/auth/auth.service.spec.ts --verbose
```

Expected: FAIL — `Cannot find module './auth.service'`

**Step 3: Implement AuthService**

Create `apps/api/src/auth/auth.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto, LoginDto, AuthResponse } from '@fitsy/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let familyId: string | undefined;
    if (dto.inviteCode) {
      const family = await this.prisma.family.findUnique({
        where: { inviteCode: dto.inviteCode },
      });
      if (!family) {
        throw new UnauthorizedException('Invalid invite code');
      }
      familyId = family.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        familyId,
      },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as any,
        familyId: user.familyId,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as any,
        familyId: user.familyId,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

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
      avatarUrl: user.avatarUrl,
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

**Step 4: Create JWT strategy and guards**

Create `apps/api/src/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

Create `apps/api/src/auth/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Create `apps/api/src/auth/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@fitsy/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

Create `apps/api/src/auth/roles.guard.ts`:

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
      where: { id: request.user.userId },
    });
    if (!user) return false;

    return requiredRoles.includes(user.role as Role);
  }
}
```

**Step 5: Create AuthController**

Create `apps/api/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { registerSchema, loginSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: any,
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: any,
  ) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.userId);
  }
}
```

**Step 6: Create ZodValidationPipe**

Create `apps/api/src/common/zod-validation.pipe.ts`:

```typescript
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
```

**Step 7: Create AuthModule**

Create `apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 8: Update AppModule**

Modify `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
```

**Step 9: Run tests**

```bash
cd apps/api && npx jest src/auth/auth.service.spec.ts --verbose
```

Expected: All tests PASS

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: add auth module with register, login, JWT, and role guards"
```

---

### Task 6: Family module

**Files:**
- Create: `apps/api/src/family/family.module.ts`
- Create: `apps/api/src/family/family.service.ts`
- Create: `apps/api/src/family/family.controller.ts`
- Create: `apps/api/src/family/family.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test for family.service**

Create `apps/api/src/family/family.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { FamilyService } from './family.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FamilyService', () => {
  let service: FamilyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      family: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      activityType: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
  });

  describe('createFamily', () => {
    it('should create a family and promote user to admin', async () => {
      prisma.family.create.mockResolvedValue({
        id: 'family-1',
        name: 'Smiths',
        inviteCode: 'ABC123',
        createdAt: new Date(),
      });
      prisma.user.update.mockResolvedValue({ id: 'user-1', role: 'ADMIN' });
      prisma.activityType.createMany.mockResolvedValue({ count: 6 });

      const result = await service.createFamily('user-1', { name: 'Smiths' });

      expect(result.name).toBe('Smiths');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });
  });

  describe('getMembers', () => {
    it('should return family members', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Alice', role: 'ADMIN', totalPoints: 50 },
      ]);

      const result = await service.getMembers('family-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && npx jest src/family/family.service.spec.ts --verbose
```

Expected: FAIL

**Step 3: Implement FamilyService**

Create `apps/api/src/family/family.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFamilyDto, UpdateFamilyDto, JoinFamilyDto } from '@fitsy/shared';
import { randomBytes } from 'crypto';

const DEFAULT_ACTIVITIES = [
  { name: 'Running', icon: '🏃', measurementType: 'DISTANCE' as const, pointsPerUnit: 1, unit: 'km' },
  { name: 'Cycling', icon: '🚴', measurementType: 'DISTANCE' as const, pointsPerUnit: 0.4, unit: 'km' },
  { name: 'Incline Treadmill', icon: '⛰️', measurementType: 'DISTANCE' as const, pointsPerUnit: 2, unit: 'km' },
  { name: 'Home Treadmill', icon: '🏠', measurementType: 'DISTANCE' as const, pointsPerUnit: 1, unit: 'km' },
  { name: 'Gym Workout', icon: '🏋️', measurementType: 'EFFORT' as const, pointsLow: 4, pointsMedium: 6, pointsHigh: 8, pointsExtreme: 12 },
  { name: 'Outdoor Park Walk', icon: '🌳', measurementType: 'FLAT' as const, flatPoints: 5 },
];

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  async createFamily(userId: string, dto: CreateFamilyDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const family = await tx.family.create({
        data: {
          name: dto.name,
          inviteCode: generateInviteCode(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { familyId: family.id, role: 'ADMIN' },
      });

      await tx.activityType.createMany({
        data: DEFAULT_ACTIVITIES.map((a) => ({ ...a, familyId: family.id })),
      });

      return family;
    });
  }

  async joinFamily(userId: string, dto: JoinFamilyDto) {
    const family = await this.prisma.family.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!family) {
      throw new NotFoundException('Invalid invite code');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyId) {
      throw new BadRequestException('You already belong to a family');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id },
    });

    return family;
  }

  async getFamily(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async updateFamily(familyId: string, dto: UpdateFamilyDto) {
    return this.prisma.family.update({
      where: { id: familyId },
      data: { name: dto.name },
    });
  }

  async regenerateInviteCode(familyId: string) {
    return this.prisma.family.update({
      where: { id: familyId },
      data: { inviteCode: generateInviteCode() },
    });
  }

  async getMembers(familyId: string) {
    return this.prisma.user.findMany({
      where: { familyId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        totalPoints: true,
        createdAt: true,
      },
    });
  }

  async removeMember(familyId: string, memberId: string, requesterId: string) {
    if (memberId === requesterId) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.familyId !== familyId) {
      throw new NotFoundException('Member not found in this family');
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { familyId: null, role: 'MEMBER' },
    });
  }
}
```

**Step 4: Create FamilyController**

Create `apps/api/src/family/family.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createFamilySchema, joinFamilySchema, updateFamilySchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createFamilySchema)) body: any,
  ) {
    return this.familyService.createFamily(req.user.userId, body);
  }

  @Post('join')
  async join(
    @Request() req: any,
    @Body(new ZodValidationPipe(joinFamilySchema)) body: any,
  ) {
    return this.familyService.joinFamily(req.user.userId, body);
  }

  @Get()
  async get(@Request() req: any) {
    const user = await this.familyService.getMembers(req.user.userId);
    return this.familyService.getFamily(req.user.familyId);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Request() req: any,
    @Body(new ZodValidationPipe(updateFamilySchema)) body: any,
  ) {
    return this.familyService.updateFamily(req.user.familyId, body);
  }

  @Post('regenerate-code')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async regenerateCode(@Request() req: any) {
    return this.familyService.regenerateInviteCode(req.user.familyId);
  }

  @Get('members')
  async getMembers(@Request() req: any) {
    return this.familyService.getMembers(req.user.familyId);
  }

  @Delete('members/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async removeMember(@Request() req: any, @Param('id') id: string) {
    return this.familyService.removeMember(req.user.familyId, id, req.user.userId);
  }
}
```

**Step 5: Create FamilyModule and update AppModule**

Create `apps/api/src/family/family.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';

@Module({
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
```

Update `apps/api/src/app.module.ts` to import `FamilyModule`.

**Step 6: Run tests and commit**

```bash
cd apps/api && npx jest src/family/family.service.spec.ts --verbose
git add -A
git commit -m "feat: add family module with create, join, members, invite codes"
```

---

### Task 7: Activity types module

**Files:**
- Create: `apps/api/src/activity-types/activity-types.module.ts`
- Create: `apps/api/src/activity-types/activity-types.service.ts`
- Create: `apps/api/src/activity-types/activity-types.controller.ts`
- Create: `apps/api/src/activity-types/activity-types.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test**

Test that the service correctly CRUDs activity types scoped to a family, and validates measurement-specific fields.

**Step 2: Implement ActivityTypesService**

- `findAll(familyId)` — returns active types for the family
- `create(familyId, dto)` — validates measurement-specific fields, creates type
- `update(familyId, id, dto)` — partial update
- `remove(familyId, id)` — soft delete (set isActive=false)

**Step 3: Implement ActivityTypesController**

- All routes guarded by JWT
- Create/Update/Delete guarded by RolesGuard (ADMIN only)
- GET is available to all family members
- Uses ZodValidationPipe with createActivityTypeSchema / updateActivityTypeSchema

**Step 4: Run tests and commit**

```bash
git add -A
git commit -m "feat: add activity types module with CRUD and measurement validation"
```

---

### Task 8: Activity logs module

**Files:**
- Create: `apps/api/src/activity-logs/activity-logs.module.ts`
- Create: `apps/api/src/activity-logs/activity-logs.service.ts`
- Create: `apps/api/src/activity-logs/activity-logs.controller.ts`
- Create: `apps/api/src/activity-logs/activity-logs.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test**

Test point calculation for each measurement type:
- DISTANCE: `distanceKm * pointsPerUnit` → e.g. 5km running = 5 pts
- EFFORT: maps effortLevel to the right tier points → e.g. HIGH gym = 8 pts
- FLAT: returns flatPoints → e.g. park walk = 5 pts
- DURATION: `durationMinutes * pointsPerMinute` → e.g. 30min yoga at 0.067 pts/min = 2 pts

Also test that user's `totalPoints` is incremented.

**Step 2: Implement ActivityLogsService**

- `create(userId, dto)` — lookup activity type, calculate points based on measurement type, create log, increment user's totalPoints in a transaction
- `findOwn(userId, pagination)` — user's own activity history, paginated
- `findFeed(familyId, limit)` — recent family activity feed with user names and activity type info

**Step 3: Implement ActivityLogsController**

- POST `/activity-logs` — log an activity (any member)
- GET `/activity-logs` — own history with `?page=1&limit=20`
- GET `/activity-logs/feed` — family feed with `?limit=20`

**Step 4: Run tests and commit**

```bash
git add -A
git commit -m "feat: add activity logs module with point calculation and family feed"
```

---

### Task 9: Rewards and redemptions modules

**Files:**
- Create: `apps/api/src/rewards/rewards.module.ts`
- Create: `apps/api/src/rewards/rewards.service.ts`
- Create: `apps/api/src/rewards/rewards.controller.ts`
- Create: `apps/api/src/redemptions/redemptions.module.ts`
- Create: `apps/api/src/redemptions/redemptions.service.ts`
- Create: `apps/api/src/redemptions/redemptions.controller.ts`
- Create: `apps/api/src/redemptions/redemptions.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test for RedemptionsService**

Test:
- Successful redemption deducts points and creates redemption record
- Fails if insufficient points
- Fails if reward is inactive or out of stock
- Fulfill changes status to FULFILLED

**Step 2: Implement RewardsService**

- Standard CRUD scoped to familyId
- Soft delete (isActive=false)

**Step 3: Implement RedemptionsService**

- `create(userId, dto)` — in a transaction: check points >= cost, check reward active + in stock, deduct points, decrement quantity if limited, create redemption
- `findOwn(userId)` — user's redemption history
- `findAll(familyId)` — admin view of all family redemptions
- `fulfill(familyId, redemptionId)` — mark as fulfilled

**Step 4: Create controllers and modules**

**Step 5: Run tests and commit**

```bash
git add -A
git commit -m "feat: add rewards and redemptions modules with point deduction"
```

---

### Task 10: Leaderboard and dashboard modules

**Files:**
- Create: `apps/api/src/leaderboard/leaderboard.module.ts`
- Create: `apps/api/src/leaderboard/leaderboard.service.ts`
- Create: `apps/api/src/leaderboard/leaderboard.controller.ts`
- Create: `apps/api/src/dashboard/dashboard.module.ts`
- Create: `apps/api/src/dashboard/dashboard.service.ts`
- Create: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Implement LeaderboardService**

- `getRankings(familyId, period)` — query activity logs grouped by user for the period (week/month/alltime), return sorted by total points earned in that period + activity count

**Step 2: Implement DashboardService**

- `getDashboard(userId)` — aggregate: total points, points this week, activities this week, calculate current streak (consecutive days with at least 1 activity), recent 5 activities

**Step 3: Create controllers**

- GET `/leaderboard?period=week` — JWT protected
- GET `/dashboard` — JWT protected

**Step 4: Run tests and commit**

```bash
git add -A
git commit -m "feat: add leaderboard and dashboard endpoints"
```

---

## Phase 3: Next.js Frontend Setup

### Task 11: Scaffold Next.js app with Mantine

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/theme.ts`
- Create: `apps/web/postcss.config.cjs`

**Step 1: Create apps/web/package.json**

```json
{
  "name": "@fitsy/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@fitsy/shared": "workspace:*",
    "@mantine/core": "^7.15.0",
    "@mantine/hooks": "^7.15.0",
    "@mantine/form": "^7.15.0",
    "@mantine/notifications": "^7.15.0",
    "@tabler/icons-react": "^3.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.5.0"
  }
}
```

**Step 2: Create apps/web/src/theme.ts**

```typescript
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  defaultRadius: 'md',
});
```

**Step 3: Create apps/web/src/app/layout.tsx**

```tsx
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';

export const metadata = {
  title: 'Fitsy — Family Fitness Tracker',
  description: 'Earn points for fitness activities and redeem rewards with your family',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#12b886" />
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
```

**Step 4: Create placeholder page**

```tsx
// apps/web/src/app/page.tsx
import { Title, Text, Container } from '@mantine/core';

export default function Home() {
  return (
    <Container size="sm" py="xl">
      <Title>Fitsy</Title>
      <Text>Family Fitness Tracker — coming soon.</Text>
    </Container>
  );
}
```

**Step 5: Create next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
};

export default nextConfig;
```

**Step 6: Install, verify dev server starts, commit**

```bash
pnpm install
cd apps/web && pnpm dev  # verify it starts on :3000
git add -A
git commit -m "feat: scaffold Next.js app with Mantine UI and dark mode"
```

---

### Task 12: API client and auth context

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/auth-context.tsx`
- Create: `apps/web/src/lib/use-api.ts`

**Step 1: Create apps/web/src/lib/api.ts**

A thin fetch wrapper that handles JWT tokens, base URL, and error responses:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('fitsy_token', token);
    } else {
      localStorage.removeItem('fitsy_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = typeof window !== 'undefined'
        ? localStorage.getItem('fitsy_token')
        : null;
    }
    return this.token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: any) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  patch<T>(path: string, body: any) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
```

**Step 2: Create auth context**

React context that provides current user, login/register/logout functions, and loading state. Checks `/auth/me` on mount to restore sessions from stored JWT.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add API client and auth context for frontend"
```

---

### Task 13: Auth pages (login, register, join)

**Files:**
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/register/page.tsx`
- Create: `apps/web/src/app/(auth)/join/[code]/page.tsx`
- Create: `apps/web/src/app/(auth)/layout.tsx`

**Step 1: Create auth layout**

Centered card layout for auth pages — Mantine `Center` + `Paper` + fitness branding.

**Step 2: Create login page**

- Mantine `TextInput` for email, `PasswordInput` for password
- `useForm` from `@mantine/form` with Zod validation (loginSchema)
- On submit: call `api.post('/auth/login')`, set token, redirect to `/dashboard`
- Link to register page

**Step 3: Create register page**

- Name, email, password fields
- Optional invite code field
- On submit: register → if no invite code and no family, redirect to create family flow
- Link to login page

**Step 4: Create join page**

- Pre-fills invite code from URL param
- Same as register but with invite code locked in

**Step 5: Verify in browser, commit**

```bash
git add -A
git commit -m "feat: add login, register, and join pages"
```

---

### Task 14: App shell and navigation

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/AppShell.tsx`
- Create: `apps/web/src/components/BottomNav.tsx`
- Create: `apps/web/src/components/ThemeToggle.tsx`
- Create: `apps/web/src/components/PointsBadge.tsx`

**Step 1: Create AppShell component**

Use Mantine `AppShell` with:
- Header: app name "Fitsy", PointsBadge (current points), ThemeToggle, user menu (profile, admin if admin, logout)
- Navbar (desktop): sidebar nav links
- Footer (mobile): BottomNav with 4 tabs (Dashboard, Log, Rewards, Leaderboard)
- Responsive: navbar hidden on mobile, footer hidden on desktop

**Step 2: Create ThemeToggle**

Uses `useMantineColorScheme()` to toggle between light/dark/auto.

**Step 3: Create BottomNav**

4 tabs using Mantine `SegmentedControl` or custom tab bar at the bottom of the screen. Icons from `@tabler/icons-react`: IconDashboard, IconPlus, IconGift, IconTrophy.

**Step 4: Create PointsBadge**

Mantine `Badge` showing user's current point balance from auth context.

**Step 5: Create (app) layout**

Wraps all authenticated pages in the AppShell. Redirects to `/login` if not authenticated.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add app shell with responsive nav, dark mode toggle, points badge"
```

---

### Task 15: Dashboard page

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/page.tsx`
- Create: `apps/web/src/components/StatCards.tsx`
- Create: `apps/web/src/components/QuickLogFAB.tsx`
- Create: `apps/web/src/components/FeedItem.tsx`

**Step 1: Create StatCards**

4 cards in a `SimpleGrid`: Total Points, Points This Week, Activities This Week, Current Streak. Each card uses Mantine `Paper` with an icon and value.

**Step 2: Create QuickLogFAB**

Floating action button (Mantine `ActionIcon` or `Affix`) that links to `/log`.

**Step 3: Create FeedItem**

Displays a single activity log entry: user avatar/initial, "Name did Activity → +X pts", relative timestamp. Uses Mantine `Group`, `Avatar`, `Text`.

**Step 4: Create Dashboard page**

- Fetches `/dashboard` on mount
- Renders StatCards at top
- Recent activities list using FeedItem
- QuickLogFAB in bottom-right corner
- "Create Family" or "Join Family" prompt if user has no family

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard page with stats, feed, and quick log button"
```

---

### Task 16: Activity logging page

**Files:**
- Create: `apps/web/src/app/(app)/log/page.tsx`
- Create: `apps/web/src/components/ActivityCard.tsx`

**Step 1: Create ActivityCard**

Displays an activity type as a selectable card: icon, name, measurement type indicator. Uses Mantine `Card` with hover/selected state.

**Step 2: Create Log page**

Two-step flow:
1. Select activity type — grid of ActivityCards, fetched from `/activity-types`
2. Enter measurement — dynamic form based on measurementType:
   - DISTANCE: `NumberInput` for km
   - EFFORT: `SegmentedControl` with Low/Medium/High/Extreme
   - FLAT: no input needed, just confirm
   - DURATION: `NumberInput` for minutes
3. Points preview calculated live (show "= X points" as user types)
4. Submit → POST `/activity-logs` → success notification → redirect to dashboard

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add activity logging page with dynamic measurement input"
```

---

### Task 17: History page

**Files:**
- Create: `apps/web/src/app/(app)/history/page.tsx`

**Step 1: Create History page**

- Fetches `/activity-logs?page=1&limit=20`
- Mantine `Table` or list of cards showing: date, activity name, measurement value, points earned
- Pagination at bottom
- Optional filter by activity type

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add activity history page with pagination"
```

---

### Task 18: Rewards and redemptions pages

**Files:**
- Create: `apps/web/src/app/(app)/rewards/page.tsx`
- Create: `apps/web/src/app/(app)/redemptions/page.tsx`
- Create: `apps/web/src/components/RewardCard.tsx`

**Step 1: Create RewardCard**

Card with: optional image, reward name, description, point cost badge. "Redeem" button (disabled if insufficient points, greyed out with tooltip). Uses Mantine `Card`, `Badge`, `Button`.

**Step 2: Create Rewards page**

- Fetches `/rewards`
- Grid of RewardCards
- Redeem action: confirmation modal → POST `/redemptions` → success notification → refresh points

**Step 3: Create Redemptions page**

- Fetches `/redemptions`
- Table/list: reward name, points spent, status badge (color-coded: PENDING=yellow, FULFILLED=green, CANCELLED=red), date

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add rewards catalog and redemptions history pages"
```

---

### Task 19: Leaderboard page

**Files:**
- Create: `apps/web/src/app/(app)/leaderboard/page.tsx`
- Create: `apps/web/src/components/LeaderboardTable.tsx`

**Step 1: Create LeaderboardTable**

- Mantine `Table` with rank, avatar, name, points, activity count
- Top 3 highlighted (gold/silver/bronze accent)
- Period toggle: `SegmentedControl` with week/month/all-time

**Step 2: Create Leaderboard page**

- Top section: LeaderboardTable
- Bottom section: Family activity feed (reuse FeedItem component)

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add leaderboard page with rankings and activity feed"
```

---

### Task 20: Profile and settings pages

**Files:**
- Create: `apps/web/src/app/(app)/profile/page.tsx`
- Create: `apps/web/src/app/(app)/settings/page.tsx`

**Step 1: Create Profile page**

- Display name (editable), avatar, email (read-only)
- Color scheme preference (Mantine `SegmentedControl`: Light/Dark/Auto)
- Save button

**Step 2: Create Settings page**

- Change password form (current password, new password, confirm)

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add profile and settings pages"
```

---

## Phase 4: Admin Pages

### Task 21: Admin activity types management

**Files:**
- Create: `apps/web/src/app/(app)/admin/activities/page.tsx`

**Step 1: Create admin activities page**

- Table of all activity types (active and inactive)
- "Add Activity" button → modal with form:
  - Name, icon (emoji picker or text input), measurement type selector
  - Dynamic fields based on measurement type (same pattern as log page)
- Edit action → same modal pre-filled
- Delete action → confirmation → soft delete
- Toggle active/inactive

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add admin activity types management page"
```

---

### Task 22: Admin rewards management

**Files:**
- Create: `apps/web/src/app/(app)/admin/rewards/page.tsx`

**Step 1: Create admin rewards page**

- Table/grid of rewards
- "Add Reward" button → modal: name, description, image URL, point cost, quantity (optional)
- Edit/delete actions
- Show redemption count per reward

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add admin rewards management page"
```

---

### Task 23: Admin members and redemptions pages

**Files:**
- Create: `apps/web/src/app/(app)/admin/members/page.tsx`
- Create: `apps/web/src/app/(app)/admin/redemptions/page.tsx`

**Step 1: Create admin members page**

- List of family members with role badges
- Invite code display with copy button and regenerate button
- Remove member action with confirmation

**Step 2: Create admin redemptions page**

- Table of all family redemptions
- Filter by status
- "Mark Fulfilled" button for PENDING redemptions

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin members and redemptions management pages"
```

---

## Phase 5: PWA & Docker

### Task 24: PWA setup

**Files:**
- Create: `apps/web/public/manifest.json`
- Create: `apps/web/public/sw.js`
- Create: `apps/web/public/icons/` (multiple sizes)
- Modify: `apps/web/next.config.ts`

**Step 1: Create manifest.json**

```json
{
  "name": "Fitsy — Family Fitness Tracker",
  "short_name": "Fitsy",
  "description": "Earn fitness points and redeem rewards with your family",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#12b886",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2: Create basic service worker**

Minimal service worker for app shell caching (offline fallback). Can use `next-pwa` package or a hand-written sw.js for simplicity.

**Step 3: Generate PWA icons**

Create placeholder icons at 192x192 and 512x512 (simple teal circle with "F" letter).

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest, service worker, and icons"
```

---

### Task 25: Docker Compose and Dockerfiles

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `.dockerignore`

**Step 1: Create apps/api/Dockerfile**

Multi-stage build:
- Stage 1 (build): install deps, generate Prisma client, build NestJS
- Stage 2 (runtime): copy dist + node_modules + prisma client, run with `node dist/main`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN cd apps/api && npx prisma generate
RUN pnpm turbo run build --filter=@fitsy/api

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 4000
CMD ["node", "dist/main"]
```

**Step 2: Create apps/web/Dockerfile**

Multi-stage build using Next.js standalone output:
- Stage 1: install, build
- Stage 2: copy standalone output, run

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm turbo run build --filter=@fitsy/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

**Step 3: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: fitsy
      POSTGRES_USER: fitsy
      POSTGRES_PASSWORD: fitsy_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "4000:4000"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://fitsy:fitsy_dev@postgres:5432/fitsy
      JWT_SECRET: dev-secret-change-in-production
      CORS_ORIGIN: http://localhost:3000
      PORT: "4000"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000

volumes:
  pgdata:
```

**Step 4: Create .dockerignore**

```
node_modules
.next
dist
.turbo
.git
*.md
```

**Step 5: Test docker compose**

```bash
docker compose up --build
```

Expected: All 3 services start. Web accessible at :3000, API at :4000.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Docker Compose and multi-stage Dockerfiles for local dev"
```

---

### Task 26: Database seeding script

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (add prisma seed config)

**Step 1: Create seed script**

Creates a demo family with:
- Admin user: `admin@fitsy.dev` / `password123`
- Member user: `member@fitsy.dev` / `password123`
- Default activity types (already handled by family creation, but seed adds sample activity logs)
- Sample rewards: "Movie Night" (50 pts), "Pizza Dinner" (100 pts), "New Running Shoes" (500 pts)
- A few sample activity logs for both users

**Step 2: Add prisma seed config to package.json**

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Step 3: Run seed and verify**

```bash
cd apps/api && npx prisma db seed
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add database seed script with demo family and sample data"
```

---

## Phase 6: Final Polish

### Task 27: Create family and join family flows

**Files:**
- Create: `apps/web/src/app/(app)/create-family/page.tsx`
- Create: `apps/web/src/app/(app)/join-family/page.tsx`

**Step 1: Create family creation page**

- Shown when authenticated user has no family
- Simple form: family name → POST `/family` → redirect to dashboard
- Or "Join existing family" link

**Step 2: Create join family page**

- Invite code input → POST `/family/join` → redirect to dashboard

**Step 3: Update dashboard to redirect if no family**

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add create/join family onboarding flow"
```

---

### Task 28: End-to-end smoke test

**Step 1: Start docker compose**

```bash
docker compose up --build -d
```

**Step 2: Run through the full user journey manually**

1. Register as admin@test.com
2. Create family "Test Family"
3. Copy invite code
4. Register as member@test.com with invite code
5. Log a few activities as both users
6. Check leaderboard shows both users ranked
7. As admin: create a reward
8. As member: redeem the reward
9. As admin: fulfill the redemption
10. Verify points are correct throughout

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Scaffolding | 1-2 | Turborepo monorepo + shared package |
| 2. Backend | 3-10 | NestJS API with all modules |
| 3. Frontend | 11-20 | Next.js pages with Mantine UI |
| 4. Admin | 21-23 | Admin management pages |
| 5. PWA & Docker | 24-26 | PWA setup, Docker, seeding |
| 6. Polish | 27-28 | Onboarding flows, smoke test |

**Total: 28 tasks across 6 phases.**
