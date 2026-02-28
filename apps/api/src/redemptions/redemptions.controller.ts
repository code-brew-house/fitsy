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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createRedemptionSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('redemptions')
@UseGuards(JwtAuthGuard)
export class RedemptionsController {
  constructor(private redemptionsService: RedemptionsService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createRedemptionSchema)) body: any,
  ) {
    return this.redemptionsService.create(req.user.userId, body);
  }

  @Get()
  async findOwn(@Request() req: any) {
    return this.redemptionsService.findOwn(req.user.userId);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(@Request() req: any) {
    const familyId = await this.redemptionsService.getFamilyIdForUser(
      req.user.userId,
    );
    return this.redemptionsService.findAll(familyId);
  }

  @Patch(':id/fulfill')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async fulfill(@Request() req: any, @Param('id') id: string) {
    const familyId = await this.redemptionsService.getFamilyIdForUser(
      req.user.userId,
    );
    return this.redemptionsService.fulfill(familyId, id);
  }
}
