import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { toggleReactionSchema } from '@fitsy/shared';

@Controller('activity-logs/:activityLogId/reactions')
@UseGuards(BetterAuthGuard)
export class ReactionsController {
  constructor(private reactionsService: ReactionsService) {}

  @Post()
  async toggle(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
    @Body(new ZodValidationPipe(toggleReactionSchema)) body: any,
  ) {
    return this.reactionsService.toggle(
      activityLogId,
      req.user.id,
      body,
    );
  }

  @Get()
  async getSummary(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
  ) {
    return this.reactionsService.getSummary(
      activityLogId,
      req.user.id,
    );
  }
}
