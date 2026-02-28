import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { FamilyService } from '../family/family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createActivityLogSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(
    private activityLogsService: ActivityLogsService,
    private familyService: FamilyService,
  ) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createActivityLogSchema)) body: any,
  ) {
    return this.activityLogsService.create(req.user.userId, body);
  }

  @Get()
  async findOwn(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogsService.findOwn(
      req.user.userId,
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
    );
  }

  @Get('feed')
  async findFeed(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.activityLogsService.findFeed(familyId, parseInt(limit ?? '20', 10));
  }
}
