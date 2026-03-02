import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ActivityTypesService } from './activity-types.service';
import { ClubService } from '../club/club.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createActivityTypeSchema, updateActivityTypeSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('activity-types')
@UseGuards(BetterAuthGuard)
export class ActivityTypesController {
  constructor(
    private activityTypesService: ActivityTypesService,
    private clubService: ClubService,
  ) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.activityTypesService.findAll(clubId, includeInactive === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createActivityTypeSchema)) body: any,
  ) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.activityTypesService.create(clubId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateActivityTypeSchema)) body: any,
  ) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.activityTypesService.update(clubId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Request() req: any, @Param('id') id: string) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.activityTypesService.remove(clubId, id);
  }
}
