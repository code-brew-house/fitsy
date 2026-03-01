import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { FamilyService } from '../family/family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createActivityLogSchema, updateActivityLogSchema } from '@fitsy/shared';
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
    @Query('activityTypeId') activityTypeId?: string,
  ) {
    return this.activityLogsService.findOwn(
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      activityTypeId,
    );
  }

  @Get('feed')
  async findFeed(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.activityLogsService.findFeed(familyId, req.user.userId, parseInt(limit ?? '20', 10));
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateActivityLogSchema)) body: any,
  ) {
    return this.activityLogsService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.activityLogsService.remove(req.user.userId, id);
  }
}
