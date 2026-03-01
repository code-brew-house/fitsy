import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';

@Controller('users')
@UseGuards(BetterAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id/profile')
  async getProfile(@Request() req: any, @Param('id') id: string) {
    return this.usersService.getProfile(req.user.id, id);
  }
}
