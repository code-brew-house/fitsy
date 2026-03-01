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
import { FamilyService } from '../family/family.service';
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
    private familyService: FamilyService,
  ) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const familyId = await this.familyService.getUserFamilyId(req.user.id);
    return this.activityTypesService.findAll(familyId, includeInactive === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createActivityTypeSchema)) body: any,
  ) {
    const familyId = await this.familyService.getUserFamilyId(req.user.id);
    return this.activityTypesService.create(familyId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateActivityTypeSchema)) body: any,
  ) {
    const familyId = await this.familyService.getUserFamilyId(req.user.id);
    return this.activityTypesService.update(familyId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Request() req: any, @Param('id') id: string) {
    const familyId = await this.familyService.getUserFamilyId(req.user.id);
    return this.activityTypesService.remove(familyId, id);
  }
}
