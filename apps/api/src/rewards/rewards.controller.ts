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
import { RewardsService } from './rewards.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createRewardSchema, updateRewardSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('rewards')
@UseGuards(BetterAuthGuard)
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const familyId = await this.rewardsService.getFamilyIdForUser(req.user.id);
    return this.rewardsService.findAll(familyId, includeInactive === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createRewardSchema)) body: any,
  ) {
    const familyId = await this.rewardsService.getFamilyIdForUser(req.user.id);
    return this.rewardsService.create(familyId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRewardSchema)) body: any,
  ) {
    const familyId = await this.rewardsService.getFamilyIdForUser(req.user.id);
    return this.rewardsService.update(familyId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Request() req: any, @Param('id') id: string) {
    const familyId = await this.rewardsService.getFamilyIdForUser(req.user.id);
    return this.rewardsService.remove(familyId, id);
  }
}
