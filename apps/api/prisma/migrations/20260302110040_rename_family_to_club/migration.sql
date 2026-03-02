-- Rename Family table to Club
ALTER TABLE "Family" RENAME TO "Club";

-- Rename familyId columns to clubId
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
