import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createCommentSchema, updateCommentSchema } from '@fitsy/shared';

@Controller('activity-logs/:activityLogId/comments')
@UseGuards(BetterAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
  ) {
    return this.commentsService.findByActivityLog(
      activityLogId,
      req.user.id,
    );
  }

  @Post()
  async create(
    @Request() req: any,
    @Param('activityLogId') activityLogId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: any,
  ) {
    return this.commentsService.create(activityLogId, req.user.id, body);
  }

  @Patch(':commentId')
  async update(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: any,
  ) {
    return this.commentsService.update(commentId, req.user.id, body);
  }

  @Delete(':commentId')
  @HttpCode(204)
  async remove(
    @Request() req: any,
    @Param('commentId') commentId: string,
  ) {
    await this.commentsService.remove(commentId, req.user.id);
  }
}
