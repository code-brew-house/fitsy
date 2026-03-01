import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';

@Controller('dashboard')
@UseGuards(BetterAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Request() req: any) {
    return this.dashboardService.getDashboard(req.user.id);
  }
}
