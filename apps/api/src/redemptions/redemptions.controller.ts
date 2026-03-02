import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createRedemptionSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('redemptions')
@UseGuards(BetterAuthGuard)
export class RedemptionsController {
  constructor(private redemptionsService: RedemptionsService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createRedemptionSchema)) body: any,
  ) {
    return this.redemptionsService.create(req.user.id, body);
  }

  @Get()
  async findOwn(@Request() req: any) {
    return this.redemptionsService.findOwn(req.user.id);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(@Request() req: any) {
    const clubId = await this.redemptionsService.getClubIdForUser(
      req.user.id,
    );
    return this.redemptionsService.findAll(clubId);
  }

  @Patch(':id/fulfill')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async fulfill(@Request() req: any, @Param('id') id: string) {
    const clubId = await this.redemptionsService.getClubIdForUser(
      req.user.id,
    );
    return this.redemptionsService.fulfill(clubId, id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async cancel(@Request() req: any, @Param('id') id: string) {
    const clubId = await this.redemptionsService.getClubIdForUser(
      req.user.id,
    );
    return this.redemptionsService.cancel(clubId, id);
  }
}
