# Activity Editing, Comments & Reactions — Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

ActivityLogs are immutable after creation. Users cannot fix mistakes, add context, or interact socially with family members' activities.

## Requirements

- Edit and delete own activity logs with full point recalculation
- Personal note on each activity (author-only, added at log time or edited later)
- Family comments on feed activities (text, CRUD by author)
- Emoji reactions on feed activities (toggle, predefined set)
- Dedicated "My Activities" page for managing own logs

## Data Model

### ActivityLog — updated

Add optional `note` field (String?, max 500 chars) for personal notes by the author.
Add relations to Comment and Reaction models.

### Comment — new model

| Field         | Type     | Notes                          |
|---------------|----------|--------------------------------|
| id            | UUID     | Primary key                    |
| activityLogId | UUID     | FK to ActivityLog, cascade delete |
| userId        | UUID     | FK to User (commenter)         |
| text          | String   | Max 500 chars, Zod validated   |
| createdAt     | DateTime | Auto                           |
| updatedAt     | DateTime | Auto                           |

### Reaction — new model

| Field         | Type     | Notes                                    |
|---------------|----------|------------------------------------------|
| id            | UUID     | Primary key                              |
| activityLogId | UUID     | FK to ActivityLog, cascade delete        |
| userId        | UUID     | FK to User (reactor)                     |
| emoji         | String   | Single emoji from allowed set            |
| createdAt     | DateTime | Auto                                     |

Unique constraint: `(activityLogId, userId, emoji)` — one reaction per emoji per user per activity.

Allowed emojis: `['👍', '🔥', '🎉', '💪', '❤️']`

## API Endpoints

### Activity Log Edit/Delete

**PATCH /activity-logs/:id** — Edit own activity log
- Auth: JWT, must be log owner
- Body: `{ distanceKm?, effortLevel?, durationMinutes?, note? }`
- Recalculates points in a transaction, adjusts user totalPoints by delta

**DELETE /activity-logs/:id** — Delete own activity log
- Auth: JWT, must be log owner
- Transaction: delete log (cascades) + subtract pointsEarned from user totalPoints
- Returns 204

### Comments

**GET /activity-logs/:id/comments** — List comments (same-family auth)
**POST /activity-logs/:id/comments** — Add comment (same-family auth), body: `{ text }`
**PATCH /activity-logs/:id/comments/:commentId** — Edit own comment
**DELETE /activity-logs/:id/comments/:commentId** — Delete own comment

### Reactions

**POST /activity-logs/:id/reactions** — Toggle reaction (same-family auth), body: `{ emoji }`
- Returns `{ added: boolean }`

**GET /activity-logs/:id/reactions** — Reaction summary
- Returns `{ reactions: [{ emoji, count, userReacted }] }`

### Feed Enhancement

Existing `GET /activity-logs/feed` enhanced to include:
- `note` field on each activity
- `commentCount` number
- `reactions` summary array `[{ emoji, count, userReacted }]`

## UI Design

### New: My Activities Page (`/my-activities`)

- Accessible from main navigation
- Table: Date | Activity (icon + name) | Measurement | Points | Note | Actions
- Actions: Edit (pencil) and Delete (trash) icon buttons
- Date range filter (last 30 days default)
- Pagination
- Edit modal: measurement input (type-specific) + note textarea + points preview
- Delete modal: confirmation with points warning

### Enhanced: FeedItem Component

- Display note as italic text below activity details
- Reaction bar: emoji buttons with counts, toggle on click, highlight own reactions
- Comment count with "View comments" toggle
- Expandable comment section: list of comments + add comment input
- Own comments show edit/delete options

### Enhanced: Log Page

- Add optional "Note" textarea in Step 2 (after measurement input)
- Placeholder: "Add a note about your workout... (optional)"

### Navigation

- Add "My Activities" link to sidebar (list/pencil icon)

## Shared Types

### New types in `packages/shared/src/types.ts`

```typescript
interface CommentResponse {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
}

// Updated ActivityLogResponse adds:
//   note: string | null
//   commentCount: number
//   reactions: ReactionSummary[]
```

### New Zod schemas in `packages/shared/src/schemas.ts`

- `UpdateActivityLogSchema` — partial of create + note field
- `CreateCommentSchema` — `{ text: z.string().max(500) }`
- `UpdateCommentSchema` — same as create
- `ToggleReactionSchema` — `{ emoji: z.enum(['👍','🔥','🎉','💪','❤️']) }`

## Error Handling

- 403 if editing/deleting someone else's log or comment
- 403 if commenting/reacting on activity outside your family
- 404 if activity log or comment not found
- 400 for validation failures (empty text, invalid emoji, wrong measurement fields)

## Testing

- Unit tests for point recalculation logic (delta calculation)
- Integration tests for edit/delete endpoints with point adjustment
- Integration tests for comment CRUD with authorization
- Integration tests for reaction toggle behavior
- Frontend component tests for new UI elements
