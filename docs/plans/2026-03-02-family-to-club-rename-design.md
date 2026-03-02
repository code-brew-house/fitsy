# Family → Club Rename + Navbar Fix Design

**Date:** 2026-03-02
**Status:** Approved

## Overview

Two changes:
1. Rename the "Family" concept to "Club" across the entire stack (DB, API, shared types, frontend, URLs)
2. Fix mobile navbar content being hidden behind the bottom navigation bar

## 1. Database Migration

- Rename table `Family` → `Club`
- Rename columns: `familyId` → `clubId` on `User`, `ActivityType`, `Reward`
- Rename index: `user_familyId_idx` → `user_clubId_idx`
- Verify all foreign key indexes are preserved
- Update Prisma schema model `Family` → `Club` with all relations

Uses `ALTER TABLE RENAME` / `ALTER COLUMN RENAME` — no data loss.

## 2. API Backend

- Rename module directory: `apps/api/src/family/` → `apps/api/src/club/`
- Rename files: `family.{module,controller,service,service.spec}.ts` → `club.*`
- Rename classes: `FamilyModule` → `ClubModule`, `FamilyController` → `ClubController`, `FamilyService` → `ClubService`
- Rename API routes: `/family` → `/club` (all sub-routes)
- Update all services referencing `familyId` → `clubId` and `getUserFamilyId()` → `getUserClubId()`:
  - activity-types, rewards, leaderboard, activity-logs, dashboard, auth
- Seed data: "The Smiths" → "Smith Fitness Club"
- AppModule import: `FamilyModule` → `ClubModule`

## 3. Shared Types & Schemas

- `FamilyResponse` → `ClubResponse`
- `CreateFamilyDto` → `CreateClubDto`, `JoinFamilyDto` → `JoinClubDto`, `UpdateFamilyDto` → `UpdateClubDto`
- `createFamilySchema` → `createClubSchema`, `joinFamilySchema` → `joinClubSchema`, `updateFamilySchema` → `updateClubSchema`
- `UserResponse.familyId` → `UserResponse.clubId`

## 4. Frontend

- Rename page directories: `setup-family/` → `setup-club/`, `create-family/` → `create-club/`, `join-family/` → `join-club/`
- Update route constants: `FAMILY_SETUP_PATHS` → `CLUB_SETUP_PATHS`
- Update all UI text: "Family" → "Club" in labels, descriptions, placeholders
- Update auth context: `familyId` → `clubId`
- Update all API fetch URLs: `/family` → `/club`
- Update register page invite code description
- PWA manifest: "Family Fitness Tracker" → "Fitness Club Tracker"

## 5. Navbar Bottom Padding Fix

- File: `apps/web/src/components/AppShell.tsx`
- Add `paddingBottom: calc(60px + env(safe-area-inset-bottom, 0px))` to `MantineAppShell.Navbar`
- Only on mobile (below `sm` breakpoint) since the bottom nav is `hiddenFrom="sm"`
