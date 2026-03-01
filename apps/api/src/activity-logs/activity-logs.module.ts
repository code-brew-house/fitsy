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
