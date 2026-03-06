-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Club" RENAME CONSTRAINT "Family_pkey" TO "Club_pkey";

-- RenameIndex
ALTER INDEX "Family_inviteCode_key" RENAME TO "Club_inviteCode_key";
