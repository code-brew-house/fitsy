import { z } from 'zod';
import { MeasurementType, EffortLevel } from './enums';

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
  note: z.string().max(500).optional(),
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

// Leaderboard
export const leaderboardQuerySchema = z.object({
  period: z.enum(['week', 'month', 'alltime']).default('week'),
});
