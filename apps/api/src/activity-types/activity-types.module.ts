import { Module } from '@nestjs/common';
import { ActivityTypesService } from './activity-types.service';
import { ActivityTypesController } from './activity-types.controller';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [FamilyModule],
  controllers: [ActivityTypesController],
  providers: [ActivityTypesService],
  exports: [ActivityTypesService],
})
export class ActivityTypesModule {}
