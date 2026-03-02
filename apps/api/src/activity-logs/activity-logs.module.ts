import { Module } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';
import { ClubModule } from '../club/club.module';
import { ReactionsModule } from '../reactions/reactions.module';

@Module({
  imports: [ClubModule, ReactionsModule],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
