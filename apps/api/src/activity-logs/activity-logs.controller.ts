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
  ForbiddenException,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ClubService } from '../club/club.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { createActivityLogSchema, updateActivityLogSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('activity-logs')
@UseGuards(BetterAuthGuard)
export class ActivityLogsController {
  constructor(
    private activityLogsService: ActivityLogsService,
    private clubService: ClubService,
  ) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createActivityLogSchema)) body: any,
  ) {
    return this.activityLogsService.create(req.user.id, body);
  }

  @Get()
  async findOwn(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activityTypeId') activityTypeId?: string,
    @Query('userId') userId?: string,
  ) {
    if (userId) {
      const requesterClubId = await this.clubService.getUserClubId(req.user.id);
      const targetClubId = await this.clubService.getUserClubId(userId);
      if (requesterClubId !== targetClubId) {
        throw new ForbiddenException('You can only view activities of club members');
      }
    }
    return this.activityLogsService.findOwn(
      userId || req.user.id,
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
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.activityLogsService.findFeed(clubId, req.user.id, parseInt(limit ?? '20', 10));
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateActivityLogSchema)) body: any,
  ) {
    return this.activityLogsService.update(req.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.activityLogsService.remove(req.user.id, id);
  }
}
