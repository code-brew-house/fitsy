import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createFamilySchema, joinFamilySchema, updateFamilySchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createFamilySchema)) body: any,
  ) {
    return this.familyService.createFamily(req.user.userId, body);
  }

  @Post('join')
  async join(
    @Request() req: any,
    @Body(new ZodValidationPipe(joinFamilySchema)) body: any,
  ) {
    return this.familyService.joinFamily(req.user.userId, body);
  }

  @Get()
  async getFamily(@Request() req: any) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.familyService.getFamily(familyId);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Request() req: any,
    @Body(new ZodValidationPipe(updateFamilySchema)) body: any,
  ) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.familyService.updateFamily(familyId, body);
  }

  @Post('regenerate-code')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async regenerateCode(@Request() req: any) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.familyService.regenerateInviteCode(familyId);
  }

  @Get('members')
  async getMembers(@Request() req: any) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.familyService.getMembers(familyId);
  }

  @Delete('members/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async removeMember(@Request() req: any, @Param('id') memberId: string) {
    const familyId = await this.familyService.getUserFamilyId(req.user.userId);
    return this.familyService.removeMember(familyId, memberId, req.user.userId);
  }
}
