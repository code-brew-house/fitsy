import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FamilyModule } from './family/family.module';
import { ActivityTypesModule } from './activity-types/activity-types.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';

@Module({
  imports: [PrismaModule, AuthModule, FamilyModule, ActivityTypesModule, ActivityLogsModule],
})
export class AppModule {}
