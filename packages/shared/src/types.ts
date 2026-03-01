import { z } from 'zod';
import * as schemas from './schemas';
import { Role, MeasurementType, EffortLevel, RedemptionStatus } from './enums';

// Request types (inferred from Zod schemas)
export type CreateFamilyDto = z.infer<typeof schemas.createFamilySchema>;
export type JoinFamilyDto = z.infer<typeof schemas.joinFamilySchema>;
export type UpdateFamilyDto = z.infer<typeof schemas.updateFamilySchema>;
export type CreateActivityTypeDto = z.infer<typeof schemas.createActivityTypeSchema>;
export type UpdateActivityTypeDto = z.infer<typeof schemas.updateActivityTypeSchema>;
export type CreateActivityLogDto = z.infer<typeof schemas.createActivityLogSchema>;
export type UpdateActivityLogDto = z.infer<typeof schemas.updateActivityLogSchema>;
export type CreateCommentDto = z.infer<typeof schemas.createCommentSchema>;
export type UpdateCommentDto = z.infer<typeof schemas.updateCommentSchema>;
export type ToggleReactionDto = z.infer<typeof schemas.toggleReactionSchema>;
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

export interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
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
  note: string | null;
  commentCount: number;
  reactions: ReactionSummary[];
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

export interface CommentResponse {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}
