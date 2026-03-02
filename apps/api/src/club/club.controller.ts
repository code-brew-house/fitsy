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
import { ClubService } from './club.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, createClubSchema, joinClubSchema, updateClubSchema } from '@fitsy/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('club')
@UseGuards(BetterAuthGuard)
export class ClubController {
  constructor(private clubService: ClubService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createClubSchema)) body: any,
  ) {
    return this.clubService.createClub(req.user.id, body);
  }

  @Post('join')
  async join(
    @Request() req: any,
    @Body(new ZodValidationPipe(joinClubSchema)) body: any,
  ) {
    return this.clubService.joinClub(req.user.id, body);
  }

  @Get()
  async getClub(@Request() req: any) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.clubService.getClub(clubId);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Request() req: any,
    @Body(new ZodValidationPipe(updateClubSchema)) body: any,
  ) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.clubService.updateClub(clubId, body);
  }

  @Post('regenerate-code')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async regenerateCode(@Request() req: any) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.clubService.regenerateInviteCode(clubId);
  }

  @Get('members')
  async getMembers(@Request() req: any) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.clubService.getMembers(clubId);
  }

  @Delete('members/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async removeMember(@Request() req: any, @Param('id') memberId: string) {
    const clubId = await this.clubService.getUserClubId(req.user.id);
    return this.clubService.removeMember(clubId, memberId, req.user.id);
  }
}
