import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FamilyModule } from './family/family.module';
import { ActivityTypesModule } from './activity-types/activity-types.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { RewardsModule } from './rewards/rewards.module';
import { RedemptionsModule } from './redemptions/redemptions.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommentsModule } from './comments/comments.module';
import { ReactionsModule } from './reactions/reactions.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FamilyModule,
    ActivityTypesModule,
    ActivityLogsModule,
    RewardsModule,
    RedemptionsModule,
    LeaderboardModule,
    DashboardModule,
    CommentsModule,
    ReactionsModule,
  ],
})
export class AppModule {}
