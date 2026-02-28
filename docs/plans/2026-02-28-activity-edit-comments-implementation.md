# Activity Editing, Comments & Reactions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add activity log editing/deleting, personal notes, family comments, and emoji reactions to the Fitsy app.

**Architecture:** Extend the existing ActivityLog model with a `note` field, add new Comment and Reaction Prisma models with cascade deletes, create new NestJS modules for comments and reactions, enhance the feed API to include social data, build a new "My Activities" management page, and upgrade FeedItem components with interactive comment/reaction UI.

**Tech Stack:** Prisma 6, NestJS 11, Next.js 15 (App Router), Mantine UI v7, Zod, TypeScript

---

### Task 1: Prisma Schema — Add note, Comment, Reaction models

**Files:**
- Modify: `apps/api/prisma/schema.prisma:80-92`

**Step 1: Update schema**

Add `note` field to ActivityLog and create Comment + Reaction models:

```prisma
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
}
```

Also add `comments Comment[]` and `reactions Reaction[]` relations to the User model (after the existing `redemptions` field):

```prisma
model User {
  // ... existing fields ...
  comments     Comment[]
  reactions    Reaction[]
}
```

**Step 2: Generate and apply migration**

Run: `cd apps/api && npx prisma migrate dev --name add-comments-reactions`
Expected: Migration created and applied, Prisma client regenerated.

**Step 3: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add note, Comment, Reaction models to Prisma schema"
```

---

### Task 2: Shared Types & Schemas — Add new types and update existing ones

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/types.ts`

**Step 1: Add new Zod schemas**

Add to the bottom of `packages/shared/src/schemas.ts`:

```typescript
// Activity Log Update
export const updateActivityLogSchema = z.object({
  distanceKm: z.number().positive().optional(),
  effortLevel: z.nativeEnum(EffortLevel).optional(),
  durationMinutes: z.number().int().positive().optional(),
  note: z.string().max(500).optional().nullable(),
});

// Comments
export const createCommentSchema = z.object({
  text: z.string().min(1).max(500),
});

export const updateCommentSchema = z.object({
  text: z.string().min(1).max(500),
});

// Reactions
export const ALLOWED_EMOJIS = ['👍', '🔥', '🎉', '💪', '❤️'] as const;

export const toggleReactionSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
});
```

**Step 2: Add new types and update ActivityLogResponse**

Add to `packages/shared/src/types.ts`:

```typescript
// Add these new type exports at the top with the other schema-inferred types:
export type UpdateActivityLogDto = z.infer<typeof schemas.updateActivityLogSchema>;
export type CreateCommentDto = z.infer<typeof schemas.createCommentSchema>;
export type UpdateCommentDto = z.infer<typeof schemas.updateCommentSchema>;
export type ToggleReactionDto = z.infer<typeof schemas.toggleReactionSchema>;
```

Update `ActivityLogResponse` interface — add three new fields:

```typescript
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
  note: string | null;
  commentCount: number;
  reactions: ReactionSummary[];
  createdAt: string;
}
```

Add new interfaces at the bottom:

```typescript
export interface CommentResponse {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
}
```

**Step 3: Verify shared package builds**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types and schemas for comments, reactions, activity editing"
```

---

### Task 3: Backend — Activity Log Edit & Delete endpoints

**Files:**
- Modify: `apps/api/src/activity-logs/activity-logs.controller.ts`
- Modify: `apps/api/src/activity-logs/activity-logs.service.ts`

**Step 1: Add update and delete methods to service**

Add these methods to `ActivityLogsService` in `apps/api/src/activity-logs/activity-logs.service.ts`:

```typescript
async update(userId: string, logId: string, dto: UpdateActivityLogDto) {
  const log = await this.prisma.activityLog.findUnique({
    where: { id: logId },
    include: { activityType: true },
  });
  if (!log) throw new NotFoundException('Activity log not found');
  if (log.userId !== userId) throw new ForbiddenException('Not your activity log');

  const oldPoints = log.pointsEarned;
  const newPoints = this.calculatePoints(log.activityType, {
    activityTypeId: log.activityTypeId,
    distanceKm: dto.distanceKm ?? log.distanceKm ?? undefined,
    effortLevel: dto.effortLevel ?? log.effortLevel ?? undefined,
    durationMinutes: dto.durationMinutes ?? log.durationMinutes ?? undefined,
  });
  const pointsDelta = newPoints - oldPoints;

  const [updated] = await this.prisma.$transaction([
    this.prisma.activityLog.update({
      where: { id: logId },
      data: {
        distanceKm: dto.distanceKm ?? log.distanceKm,
        effortLevel: dto.effortLevel ?? log.effortLevel,
        durationMinutes: dto.durationMinutes ?? log.durationMinutes,
        note: dto.note !== undefined ? dto.note : log.note,
        pointsEarned: newPoints,
      },
      include: {
        activityType: { select: { name: true, icon: true } },
        user: { select: { name: true } },
      },
    }),
    ...(pointsDelta !== 0
      ? [
          this.prisma.user.update({
            where: { id: userId },
            data: { totalPoints: { increment: pointsDelta } },
          }),
        ]
      : []),
  ]);

  return this.formatLogResponse(updated);
}

async remove(userId: string, logId: string) {
  const log = await this.prisma.activityLog.findUnique({
    where: { id: logId },
  });
  if (!log) throw new NotFoundException('Activity log not found');
  if (log.userId !== userId) throw new ForbiddenException('Not your activity log');

  await this.prisma.$transaction([
    this.prisma.activityLog.delete({ where: { id: logId } }),
    this.prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { decrement: log.pointsEarned } },
    }),
  ]);
}
```

Also add a `formatLogResponse` helper to the service (extracts the mapping logic used in `findOwn` and `findFeed`):

```typescript
private formatLogResponse(log: any): any {
  return {
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
    commentCount: log._count?.comments ?? 0,
    reactions: [],
    createdAt: log.createdAt.toISOString(),
  };
}
```

Add `ForbiddenException` to the imports from `@nestjs/common`. Add `UpdateActivityLogDto` to the imports from `@fitsy/shared`.

Refactor `findOwn` and `findFeed` to use `formatLogResponse` and include `note`, `_count`, and reactions data. Update the `include` clause to add:

```typescript
_count: { select: { comments: true } },
```

**Step 2: Add controller endpoints**

Add to `ActivityLogsController` in `apps/api/src/activity-logs/activity-logs.controller.ts`:

```typescript
import { Patch, Delete, Param, HttpCode } from '@nestjs/common';
import { updateActivityLogSchema } from '@fitsy/shared';

@Patch(':id')
async update(
  @Request() req: any,
  @Param('id') id: string,
  @Body(new ZodValidationPipe(updateActivityLogSchema)) body: any,
) {
  return this.activityLogsService.update(req.user.userId, id, body);
}

@Delete(':id')
@HttpCode(204)
async remove(@Request() req: any, @Param('id') id: string) {
  await this.activityLogsService.remove(req.user.userId, id);
}
```

**Step 3: Verify build**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/api/src/activity-logs/
git commit -m "feat: add PATCH and DELETE endpoints for activity logs with point recalculation"
```

---

### Task 4: Backend — Comments module (CRUD)

**Files:**
- Create: `apps/api/src/comments/comments.module.ts`
- Create: `apps/api/src/comments/comments.controller.ts`
- Create: `apps/api/src/comments/comments.service.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create comments service**

Create `apps/api/src/comments/comments.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from '@fitsy/shared';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findByActivityLog(activityLogId: string, requesterId: string) {
    await this.verifyFamilyAccess(activityLogId, requesterId);

    const comments = await this.prisma.comment.findMany({
      where: { activityLogId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.user.name,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async create(activityLogId: string, userId: string, dto: CreateCommentDto) {
    await this.verifyFamilyAccess(activityLogId, userId);

    const comment = await this.prisma.comment.create({
      data: {
        activityLogId,
        userId,
        text: dto.text,
      },
      include: { user: { select: { name: true } } },
    });

    return {
      id: comment.id,
      userId: comment.userId,
      userName: comment.user.name,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { text: dto.text },
      include: { user: { select: { name: true } } },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user.name,
      text: updated.text,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  private async verifyFamilyAccess(activityLogId: string, userId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: activityLogId },
      include: { user: { select: { familyId: true } } },
    });
    if (!log) throw new NotFoundException('Activity log not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!requester || requester.familyId !== log.user.familyId) {
      throw new ForbiddenException('Not in the same family');
    }
  }
}
```

**Step 2: Create comments controller**

Create `apps/api/src/comments/comments.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createCommentSchema, updateCommentSchema } from '@fitsy/shared';

@Controller('activity-logs/:activityLogId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
  ) {
    return this.commentsService.findByActivityLog(activityLogId, req.user.userId);
  }

  @Post()
  async create(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: any,
  ) {
    return this.commentsService.create(activityLogId, req.user.userId, body);
  }

  @Patch(':commentId')
  async update(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: any,
  ) {
    return this.commentsService.update(commentId, req.user.userId, body);
  }

  @Delete(':commentId')
  @HttpCode(204)
  async remove(
    @Request() req: any,
    @Param('commentId') commentId: string,
  ) {
    await this.commentsService.remove(commentId, req.user.userId);
  }
}
```

**Step 3: Create comments module**

Create `apps/api/src/comments/comments.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
```

**Step 4: Register in AppModule**

Add to `apps/api/src/app.module.ts` imports array:

```typescript
import { CommentsModule } from './comments/comments.module';
// Add CommentsModule to the imports array
```

**Step 5: Verify build**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add apps/api/src/comments/ apps/api/src/app.module.ts
git commit -m "feat: add Comments module with CRUD endpoints and family authorization"
```

---

### Task 5: Backend — Reactions module (toggle + summary)

**Files:**
- Create: `apps/api/src/reactions/reactions.module.ts`
- Create: `apps/api/src/reactions/reactions.controller.ts`
- Create: `apps/api/src/reactions/reactions.service.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create reactions service**

Create `apps/api/src/reactions/reactions.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToggleReactionDto } from '@fitsy/shared';

@Injectable()
export class ReactionsService {
  constructor(private prisma: PrismaService) {}

  async toggle(activityLogId: string, userId: string, dto: ToggleReactionDto) {
    await this.verifyFamilyAccess(activityLogId, userId);

    const existing = await this.prisma.reaction.findUnique({
      where: {
        activityLogId_userId_emoji: {
          activityLogId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      return { added: false };
    }

    await this.prisma.reaction.create({
      data: { activityLogId, userId, emoji: dto.emoji },
    });
    return { added: true };
  }

  async getSummary(activityLogId: string, userId: string) {
    await this.verifyFamilyAccess(activityLogId, userId);

    const reactions = await this.prisma.reaction.findMany({
      where: { activityLogId },
    });

    const emojiMap = new Map<string, { count: number; userReacted: boolean }>();
    for (const r of reactions) {
      const existing = emojiMap.get(r.emoji) || { count: 0, userReacted: false };
      existing.count++;
      if (r.userId === userId) existing.userReacted = true;
      emojiMap.set(r.emoji, existing);
    }

    return {
      reactions: Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        userReacted: data.userReacted,
      })),
    };
  }

  // Used by ActivityLogsService to build feed reaction summaries in bulk
  async getReactionSummariesForLogs(logIds: string[], userId: string) {
    const reactions = await this.prisma.reaction.findMany({
      where: { activityLogId: { in: logIds } },
    });

    const map = new Map<string, Map<string, { count: number; userReacted: boolean }>>();
    for (const r of reactions) {
      if (!map.has(r.activityLogId)) map.set(r.activityLogId, new Map());
      const emojiMap = map.get(r.activityLogId)!;
      const existing = emojiMap.get(r.emoji) || { count: 0, userReacted: false };
      existing.count++;
      if (r.userId === userId) existing.userReacted = true;
      emojiMap.set(r.emoji, existing);
    }

    const result: Record<string, Array<{ emoji: string; count: number; userReacted: boolean }>> = {};
    for (const logId of logIds) {
      const emojiMap = map.get(logId);
      result[logId] = emojiMap
        ? Array.from(emojiMap.entries()).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            userReacted: data.userReacted,
          }))
        : [];
    }
    return result;
  }

  private async verifyFamilyAccess(activityLogId: string, userId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: activityLogId },
      include: { user: { select: { familyId: true } } },
    });
    if (!log) throw new NotFoundException('Activity log not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!requester || requester.familyId !== log.user.familyId) {
      throw new ForbiddenException('Not in the same family');
    }
  }
}
```

**Step 2: Create reactions controller**

Create `apps/api/src/reactions/reactions.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { toggleReactionSchema } from '@fitsy/shared';

@Controller('activity-logs/:activityLogId/reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private reactionsService: ReactionsService) {}

  @Post()
  async toggle(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
    @Body(new ZodValidationPipe(toggleReactionSchema)) body: any,
  ) {
    return this.reactionsService.toggle(activityLogId, req.user.userId, body);
  }

  @Get()
  async getSummary(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
  ) {
    return this.reactionsService.getSummary(activityLogId, req.user.userId);
  }
}
```

**Step 3: Create reactions module**

Create `apps/api/src/reactions/reactions.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { ReactionsController } from './reactions.controller';

@Module({
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
```

**Step 4: Register in AppModule**

Add to `apps/api/src/app.module.ts` imports array:

```typescript
import { ReactionsModule } from './reactions/reactions.module';
// Add ReactionsModule to the imports array
```

**Step 5: Verify build**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add apps/api/src/reactions/ apps/api/src/app.module.ts
git commit -m "feat: add Reactions module with toggle and summary endpoints"
```

---

### Task 6: Backend — Enhance feed & findOwn with social data

**Files:**
- Modify: `apps/api/src/activity-logs/activity-logs.service.ts`
- Modify: `apps/api/src/activity-logs/activity-logs.module.ts`

**Step 1: Inject ReactionsService into ActivityLogsModule**

Update `apps/api/src/activity-logs/activity-logs.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';
import { FamilyModule } from '../family/family.module';
import { ReactionsModule } from '../reactions/reactions.module';

@Module({
  imports: [FamilyModule, ReactionsModule],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
```

**Step 2: Update ActivityLogsService to use ReactionsService**

Inject `ReactionsService` in the constructor:

```typescript
import { ReactionsService } from '../reactions/reactions.service';

constructor(
  private prisma: PrismaService,
  private reactionsService: ReactionsService,
) {}
```

**Step 3: Update findFeed to include note, commentCount, reactions**

Replace the `findFeed` method body. The key changes:
- Add `note` to the query select
- Add `_count: { select: { comments: true } }` to include
- After querying logs, call `reactionsService.getReactionSummariesForLogs` to get bulk reaction data
- Accept `userId` parameter (pass from controller) for `userReacted` field

Update `findFeed` signature and body:

```typescript
async findFeed(familyId: string, userId: string, limit: number = 20) {
  const users = await this.prisma.user.findMany({
    where: { familyId },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const logs = await this.prisma.activityLog.findMany({
    where: { userId: { in: userIds } },
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

**Step 4: Update findOwn similarly**

Add `_count: { select: { comments: true } }` to the include, add `note`, `commentCount`, `reactions: []` to the response mapping. Accept `userId` (already have it) for reaction data:

```typescript
async findOwn(userId: string, page: number = 1, limit: number = 20, activityTypeId?: string) {
  const where: any = { userId };
  if (activityTypeId) {
    where.activityTypeId = activityTypeId;
  }

  const [data, total] = await Promise.all([
    this.prisma.activityLog.findMany({
      where,
      include: {
        activityType: { select: { name: true, icon: true } },
        user: { select: { name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.activityLog.count({ where }),
  ]);

  const logIds = data.map((l) => l.id);
  const reactionSummaries = logIds.length
    ? await this.reactionsService.getReactionSummariesForLogs(logIds, userId)
    : {};

  return {
    data: data.map((log) => ({
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
    })),
    total,
    page,
    limit,
  };
}
```

**Step 5: Update controller to pass userId to findFeed**

In `activity-logs.controller.ts`, update the `findFeed` method:

```typescript
@Get('feed')
async findFeed(
  @Request() req: any,
  @Query('limit') limit?: string,
) {
  const familyId = await this.familyService.getUserFamilyId(req.user.userId);
  return this.activityLogsService.findFeed(familyId, req.user.userId, parseInt(limit ?? '20', 10));
}
```

**Step 6: Update create method to accept note**

In the `create` method of `ActivityLogsService`, add note to the data object:

```typescript
// In the create data object, add:
note: dto.note ?? null,
```

Update the `createActivityLogSchema` in `packages/shared/src/schemas.ts` to include optional note:

```typescript
export const createActivityLogSchema = z.object({
  activityTypeId: z.string().uuid(),
  distanceKm: z.number().positive().optional(),
  effortLevel: z.nativeEnum(EffortLevel).optional(),
  durationMinutes: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});
```

**Step 7: Verify build**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors.

**Step 8: Commit**

```bash
git add apps/api/src/activity-logs/ packages/shared/
git commit -m "feat: enhance feed and findOwn with note, commentCount, reactions data"
```

---

### Task 7: Frontend — Add note to Log Activity page

**Files:**
- Modify: `apps/web/src/app/(app)/log/page.tsx`

**Step 1: Add note state and textarea**

Add a `note` state variable:

```typescript
const [note, setNote] = useState('');
```

Add a `Textarea` import from Mantine and render it in Step 2 (after the measurement input, before the points preview Paper):

```typescript
import { Textarea } from '@mantine/core';

// Inside the Step 2 render, after the measurement inputs and before the points preview:
<Textarea
  label="Note (optional)"
  placeholder="Add a note about your workout..."
  value={note}
  onChange={(e) => setNote(e.currentTarget.value)}
  maxLength={500}
  autosize
  minRows={2}
  maxRows={4}
/>
```

**Step 2: Include note in submit body**

In the `handleSubmit` function, add note to the body if non-empty:

```typescript
if (note.trim()) {
  body.note = note.trim();
}
```

**Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/log/
git commit -m "feat: add optional note textarea to activity logging form"
```

---

### Task 8: Frontend — My Activities page with edit/delete

**Files:**
- Create: `apps/web/src/app/(app)/my-activities/page.tsx`
- Modify: `apps/web/src/components/AppShell.tsx`

**Step 1: Create My Activities page**

Create `apps/web/src/app/(app)/my-activities/page.tsx`:

This page combines the history table pattern with edit/delete actions. Key features:
- Paginated table of user's own activities
- Date range filter (last 30 days default)
- Edit modal with measurement inputs (reusing the same pattern from log page) + note textarea + points preview
- Delete confirmation modal
- Calls PATCH/DELETE endpoints and refreshes data

```typescript
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Container,
  Title,
  Table,
  Pagination,
  Select,
  Group,
  Text,
  Center,
  Loader,
  Stack,
  ActionIcon,
  Modal,
  Button,
  NumberInput,
  SegmentedControl,
  Textarea,
  Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import {
  IconListDetails,
  IconEdit,
  IconTrash,
  IconCheck,
} from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import type { ActivityLogResponse, ActivityTypeResponse } from '@fitsy/shared';
import { MeasurementType, EffortLevel } from '@fitsy/shared';

interface PaginatedResponse {
  data: ActivityLogResponse[];
  total: number;
  page: number;
  limit: number;
}

function formatMeasurement(log: ActivityLogResponse): string {
  switch (log.measurementType) {
    case MeasurementType.DISTANCE:
      return log.distanceKm ? `${log.distanceKm} km` : '-';
    case MeasurementType.EFFORT:
      return log.effortLevel
        ? log.effortLevel.charAt(0) + log.effortLevel.slice(1).toLowerCase() + ' effort'
        : '-';
    case MeasurementType.DURATION:
      return log.durationMinutes ? `${log.durationMinutes} min` : '-';
    case MeasurementType.FLAT:
      return 'Completed';
    default:
      return '-';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyActivitiesPage() {
  const { refreshUser } = useAuth();
  const [logs, setLogs] = useState<ActivityLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const limit = 20;

  // Edit modal state
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editingLog, setEditingLog] = useState<ActivityLogResponse | null>(null);
  const [editDistance, setEditDistance] = useState<number | string>(0);
  const [editEffort, setEditEffort] = useState<EffortLevel>(EffortLevel.MEDIUM);
  const [editDuration, setEditDuration] = useState<number | string>(0);
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deletingLog, setDeletingLog] = useState<ActivityLogResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/activity-logs?page=${page}&limit=${limit}`;
      if (selectedType) url += `&activityTypeId=${selectedType}`;
      const res = await api.get<PaginatedResponse>(url);
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, selectedType]);

  useEffect(() => {
    api.get<ActivityTypeResponse[]>('/activity-types').then(setActivityTypes).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const typeOptions = activityTypes.map((t) => ({
    value: t.id,
    label: `${t.icon} ${t.name}`,
  }));

  // Find activity type for editing (needed for points preview)
  const editActivityType = useMemo(() => {
    if (!editingLog) return null;
    return activityTypes.find((t) => t.id === editingLog.activityTypeId) ?? null;
  }, [editingLog, activityTypes]);

  const editPointsPreview = useMemo(() => {
    if (!editActivityType) return 0;
    switch (editActivityType.measurementType) {
      case MeasurementType.DISTANCE:
        return Math.round((Number(editDistance) || 0) * (editActivityType.pointsPerUnit || 0));
      case MeasurementType.EFFORT: {
        const map: Record<EffortLevel, number | null> = {
          [EffortLevel.LOW]: editActivityType.pointsLow,
          [EffortLevel.MEDIUM]: editActivityType.pointsMedium,
          [EffortLevel.HIGH]: editActivityType.pointsHigh,
          [EffortLevel.EXTREME]: editActivityType.pointsExtreme,
        };
        return map[editEffort] || 0;
      }
      case MeasurementType.FLAT:
        return editActivityType.flatPoints || 0;
      case MeasurementType.DURATION:
        return Math.round((Number(editDuration) || 0) * (editActivityType.pointsPerMinute || 0));
      default:
        return 0;
    }
  }, [editActivityType, editDistance, editEffort, editDuration]);

  const handleEditClick = (log: ActivityLogResponse) => {
    setEditingLog(log);
    setEditDistance(log.distanceKm ?? 0);
    setEditEffort((log.effortLevel as EffortLevel) ?? EffortLevel.MEDIUM);
    setEditDuration(log.durationMinutes ?? 0);
    setEditNote(log.note ?? '');
    openEdit();
  };

  const handleEditSave = async () => {
    if (!editingLog) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      switch (editingLog.measurementType) {
        case MeasurementType.DISTANCE:
          body.distanceKm = Number(editDistance);
          break;
        case MeasurementType.EFFORT:
          body.effortLevel = editEffort;
          break;
        case MeasurementType.DURATION:
          body.durationMinutes = Number(editDuration);
          break;
      }
      body.note = editNote.trim() || null;

      await api.patch(`/activity-logs/${editingLog.id}`, body);
      await refreshUser();
      notifications.show({
        title: 'Updated',
        message: 'Activity updated successfully',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      closeEdit();
      fetchLogs();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to update',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (log: ActivityLogResponse) => {
    setDeletingLog(log);
    openDelete();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLog) return;
    setDeleting(true);
    try {
      await api.delete(`/activity-logs/${deletingLog.id}`);
      await refreshUser();
      notifications.show({
        title: 'Deleted',
        message: `Activity deleted. ${deletingLog.pointsEarned} points removed.`,
        color: 'orange',
      });
      closeDelete();
      fetchLogs();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>
            <Group gap="xs">
              <IconListDetails size={28} />
              My Activities
            </Group>
          </Title>
          <Select
            placeholder="Filter by activity"
            data={typeOptions}
            value={selectedType}
            onChange={(val) => { setSelectedType(val); setPage(1); }}
            clearable
            w={220}
          />
        </Group>

        {loading ? (
          <Center py="xl"><Loader color="teal" /></Center>
        ) : logs.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconListDetails size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="lg">No activities yet</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Activity</Table.Th>
                  <Table.Th>Measurement</Table.Th>
                  <Table.Th ta="right">Points</Table.Th>
                  <Table.Th>Note</Table.Th>
                  <Table.Th ta="center">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{formatDate(log.createdAt)}</Table.Td>
                    <Table.Td>{log.activityTypeIcon} {log.activityTypeName}</Table.Td>
                    <Table.Td>{formatMeasurement(log)}</Table.Td>
                    <Table.Td ta="right" fw={600} c="teal">+{log.pointsEarned}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1} maw={200}>
                        {log.note || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <ActionIcon variant="subtle" color="blue" onClick={() => handleEditClick(log)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteClick(log)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Center>
                <Pagination total={totalPages} value={page} onChange={setPage} color="teal" />
              </Center>
            )}
          </>
        )}
      </Stack>

      {/* Edit Modal */}
      <Modal opened={editOpened} onClose={closeEdit} title="Edit Activity" size="md">
        {editingLog && (
          <Stack gap="md">
            <Group gap="sm">
              <Text size="lg">{editingLog.activityTypeIcon}</Text>
              <Text fw={600}>{editingLog.activityTypeName}</Text>
            </Group>

            {editingLog.measurementType === MeasurementType.DISTANCE && (
              <NumberInput
                label="Distance (km)"
                value={editDistance}
                onChange={setEditDistance}
                step={0.1}
                min={0.1}
                decimalScale={1}
                size="md"
              />
            )}

            {editingLog.measurementType === MeasurementType.EFFORT && (
              <div>
                <Text size="sm" fw={500} mb="xs">Effort Level</Text>
                <SegmentedControl
                  value={editEffort}
                  onChange={(val) => setEditEffort(val as EffortLevel)}
                  data={[
                    { label: 'Low', value: EffortLevel.LOW },
                    { label: 'Medium', value: EffortLevel.MEDIUM },
                    { label: 'High', value: EffortLevel.HIGH },
                    { label: 'Extreme', value: EffortLevel.EXTREME },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
            )}

            {editingLog.measurementType === MeasurementType.DURATION && (
              <NumberInput
                label="Duration (minutes)"
                value={editDuration}
                onChange={setEditDuration}
                step={1}
                min={1}
                size="md"
              />
            )}

            <Textarea
              label="Note"
              placeholder="Add a note..."
              value={editNote}
              onChange={(e) => setEditNote(e.currentTarget.value)}
              maxLength={500}
              autosize
              minRows={2}
              maxRows={4}
            />

            <Paper p="md" radius="md" bg="teal.0" ta="center">
              <Text size="sm" c="dimmed">Points</Text>
              <Text size="xl" fw={700} c="teal">{editPointsPreview}</Text>
              {editPointsPreview !== editingLog.pointsEarned && (
                <Text size="xs" c="dimmed">
                  was {editingLog.pointsEarned} ({editPointsPreview > editingLog.pointsEarned ? '+' : ''}{editPointsPreview - editingLog.pointsEarned})
                </Text>
              )}
            </Paper>

            <Group justify="flex-end">
              <Button variant="default" onClick={closeEdit}>Cancel</Button>
              <Button color="teal" onClick={handleEditSave} loading={saving}>Save</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Activity" size="sm">
        {deletingLog && (
          <Stack gap="md">
            <Text>
              Are you sure you want to delete this activity? You will lose{' '}
              <Text span fw={700} c="red">{deletingLog.pointsEarned} points</Text>.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDelete}>Cancel</Button>
              <Button color="red" onClick={handleDeleteConfirm} loading={deleting}>Delete</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
```

**Note on DatePickerInput:** If `@mantine/dates` is not installed, remove the `DatePickerInput` import and the date range filter. The date filter is a nice-to-have. The core functionality (table + edit + delete) works without it. Check `package.json` for `@mantine/dates` — if missing, just use the activity type filter like the history page does.

**Step 2: Add My Activities to navigation**

In `apps/web/src/components/AppShell.tsx`, add to the `secondaryNav` array (before History):

```typescript
import { IconListDetails } from '@tabler/icons-react';

const secondaryNav = [
  { label: 'My Activities', icon: IconListDetails, href: '/my-activities' },
  { label: 'History', icon: IconHistory, href: '/history' },
  { label: 'Redemptions', icon: IconReceipt, href: '/redemptions' },
  { label: 'Profile', icon: IconUser, href: '/profile' },
];
```

**Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/my-activities/ apps/web/src/components/AppShell.tsx
git commit -m "feat: add My Activities page with edit/delete functionality"
```

---

### Task 9: Frontend — Enhanced FeedItem with reactions and comments

**Files:**
- Modify: `apps/web/src/components/FeedItem.tsx`

**Step 1: Rewrite FeedItem with reactions and comments UI**

Replace the contents of `apps/web/src/components/FeedItem.tsx` with an enhanced version that includes:
- Note display (italic text below activity)
- Reaction bar (emoji buttons with counts, toggle on click, highlight user's own)
- Comment count with expandable section
- Add comment input
- Own comment edit/delete

```typescript
'use client';

import { useState } from 'react';
import {
  Group,
  Avatar,
  Text,
  Box,
  Stack,
  ActionIcon,
  Button,
  TextInput,
  Collapse,
  Paper,
  Menu,
} from '@mantine/core';
import {
  IconMessageCircle,
  IconDots,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import type { ActivityLogResponse, CommentResponse, ReactionSummary } from '@fitsy/shared';
import { ALLOWED_EMOJIS } from '@fitsy/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface FeedItemProps {
  activity: ActivityLogResponse;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function FeedItem({ activity }: FeedItemProps) {
  const { user } = useAuth();
  const initial = activity.userName?.charAt(0)?.toUpperCase() || '?';

  // Reactions state
  const [reactions, setReactions] = useState<ReactionSummary[]>(activity.reactions || []);
  const [togglingEmoji, setTogglingEmoji] = useState<string | null>(null);

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(activity.commentCount || 0);

  const handleReactionToggle = async (emoji: string) => {
    setTogglingEmoji(emoji);
    try {
      const res = await api.post<{ added: boolean }>(
        `/activity-logs/${activity.id}/reactions`,
        { emoji },
      );
      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === emoji);
        if (res.added) {
          if (existing) {
            return prev.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r,
            );
          }
          return [...prev, { emoji, count: 1, userReacted: true }];
        } else {
          if (existing && existing.count <= 1) {
            return prev.filter((r) => r.emoji !== emoji);
          }
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r,
          );
        }
      });
    } catch { /* ignore */ }
    setTogglingEmoji(null);
  };

  const loadComments = async () => {
    if (commentsLoaded) return;
    setLoadingComments(true);
    try {
      const res = await api.get<CommentResponse[]>(
        `/activity-logs/${activity.id}/comments`,
      );
      setComments(res);
      setCommentsLoaded(true);
    } catch { /* ignore */ }
    setLoadingComments(false);
  };

  const handleToggleComments = () => {
    if (!commentsOpen) loadComments();
    setCommentsOpen(!commentsOpen);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post<CommentResponse>(
        `/activity-logs/${activity.id}/comments`,
        { text: commentText.trim() },
      );
      setComments((prev) => [...prev, res]);
      setCommentCount((c) => c + 1);
      setCommentText('');
    } catch { /* ignore */ }
    setSubmittingComment(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await api.patch<CommentResponse>(
        `/activity-logs/${activity.id}/comments/${commentId}`,
        { text: editingCommentText.trim() },
      );
      setComments((prev) => prev.map((c) => (c.id === commentId ? res : c)));
      setEditingCommentId(null);
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/activity-logs/${activity.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((c) => c - 1);
    } catch { /* ignore */ }
  };

  return (
    <Box py="xs">
      <Group gap="sm" wrap="nowrap">
        <Avatar color="teal" radius="xl" size="md">
          {initial}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" lineClamp={1}>
            <Text span fw={600}>{activity.userName}</Text>
            {' '}did{' '}
            <Text span fw={600}>{activity.activityTypeName}</Text>
          </Text>
          <Group gap="xs">
            <Text size="xs" c="teal" fw={600}>
              +{activity.pointsEarned} pts
            </Text>
            <Text size="xs" c="dimmed">
              {timeAgo(activity.createdAt)}
            </Text>
          </Group>
        </Box>
      </Group>

      {/* Note */}
      {activity.note && (
        <Text size="sm" fs="italic" c="dimmed" mt={4} ml={50}>
          {activity.note}
        </Text>
      )}

      {/* Reactions bar */}
      <Group gap={4} mt="xs" ml={50}>
        {ALLOWED_EMOJIS.map((emoji) => {
          const reaction = reactions.find((r) => r.emoji === emoji);
          return (
            <ActionIcon
              key={emoji}
              variant={reaction?.userReacted ? 'filled' : 'subtle'}
              color={reaction?.userReacted ? 'teal' : 'gray'}
              size="sm"
              onClick={() => handleReactionToggle(emoji)}
              loading={togglingEmoji === emoji}
              radius="xl"
            >
              <Text size="xs">
                {emoji}
                {reaction && reaction.count > 0 ? ` ${reaction.count}` : ''}
              </Text>
            </ActionIcon>
          );
        })}

        <Button
          variant="subtle"
          color="gray"
          size="compact-xs"
          leftSection={<IconMessageCircle size={14} />}
          onClick={handleToggleComments}
        >
          {commentCount > 0 ? commentCount : ''} Comments
        </Button>
      </Group>

      {/* Comments section */}
      <Collapse in={commentsOpen}>
        <Stack gap="xs" mt="xs" ml={50}>
          {loadingComments && <Text size="xs" c="dimmed">Loading...</Text>}
          {comments.map((comment) => (
            <Paper key={comment.id} p="xs" radius="sm" bg="var(--mantine-color-default)">
              {editingCommentId === comment.id ? (
                <Group gap="xs">
                  <TextInput
                    size="xs"
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.currentTarget.value)}
                    style={{ flex: 1 }}
                    maxLength={500}
                  />
                  <Button size="compact-xs" color="teal" onClick={() => handleEditComment(comment.id)}>
                    Save
                  </Button>
                  <Button size="compact-xs" variant="subtle" onClick={() => setEditingCommentId(null)}>
                    Cancel
                  </Button>
                </Group>
              ) : (
                <Group justify="space-between" wrap="nowrap">
                  <Box>
                    <Text size="xs">
                      <Text span fw={600}>{comment.userName}</Text>{' '}
                      {comment.text}
                    </Text>
                    <Text size="xs" c="dimmed">{timeAgo(comment.createdAt)}</Text>
                  </Box>
                  {user?.id === comment.userId && (
                    <Menu shadow="md" width={120}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" size="xs">
                          <IconDots size={12} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={12} />}
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentText(comment.text);
                          }}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={12} />}
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
              )}
            </Paper>
          ))}

          {/* Add comment */}
          <Group gap="xs">
            <TextInput
              size="xs"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.currentTarget.value)}
              style={{ flex: 1 }}
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddComment();
              }}
            />
            <Button
              size="compact-xs"
              color="teal"
              onClick={handleAddComment}
              loading={submittingComment}
              disabled={!commentText.trim()}
            >
              Post
            </Button>
          </Group>
        </Stack>
      </Collapse>
    </Box>
  );
}
```

**Step 2: Update the leaderboard page feed section**

The leaderboard page (`apps/web/src/app/(app)/leaderboard/page.tsx`) renders its own inline feed items instead of using the `FeedItem` component. Replace the feed rendering section (the `feed.map` block around lines 202-230) to use the `FeedItem` component:

```typescript
import { FeedItem } from '../../../components/FeedItem';

// Replace the feed.map Paper block with:
<Stack gap="xs">
  {feed.map((item) => (
    <Paper key={item.id} p="sm" withBorder radius="sm">
      <FeedItem activity={item} />
    </Paper>
  ))}
</Stack>
```

**Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/web/src/components/FeedItem.tsx apps/web/src/app/\(app\)/leaderboard/
git commit -m "feat: enhance FeedItem with reactions, comments, and notes display"
```

---

### Task 10: Final integration — Update dashboard feed + verify everything

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx` (already uses FeedItem, just ensure it passes data correctly)

**Step 1: Verify dashboard works with enhanced ActivityLogResponse**

The dashboard fetches from `/dashboard` which returns `DashboardResponse.recentActivities`. Check if the dashboard API endpoint (`apps/api/src/dashboard/`) also needs updating to include `note`, `commentCount`, `reactions` fields.

Read the dashboard service to verify. If it constructs ActivityLogResponse objects, add the new fields. The dashboard endpoint likely calls `activityLogsService.findOwn` or does its own query — update accordingly to include `note: null`, `commentCount: 0`, `reactions: []` for dashboard items (dashboard feed items are quick summaries, full social data loads on interaction).

**Step 2: Ensure shared package exports ALLOWED_EMOJIS**

Verify `packages/shared/src/index.ts` exports everything (it uses `export * from './schemas'` which will include `ALLOWED_EMOJIS`).

**Step 3: Full build verification**

Run from monorepo root:

```bash
cd /Users/tushar/Desktop/BrewyProjects/fitsy
npx turbo build
```

Expected: All packages build successfully.

**Step 4: Manual smoke test**

Start the dev server:

```bash
npx turbo dev
```

Test these flows:
1. Log a new activity with a note at `/log`
2. Navigate to `/my-activities` — see the activity, click edit, change measurement, see points update, save
3. Delete an activity — confirm points are subtracted
4. Go to the leaderboard feed — react with emojis, see counts update
5. Open comments on a feed item — add a comment, edit it, delete it
6. Check that notes display on feed items

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete activity editing, comments, and reactions feature"
```
