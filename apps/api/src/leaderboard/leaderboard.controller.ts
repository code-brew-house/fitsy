import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';

@Controller('leaderboard')
@UseGuards(BetterAuthGuard)
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  async getRankings(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    const validPeriods: string[] = ['week', 'month', 'alltime'];
    const selectedPeriod = period && validPeriods.includes(period)
      ? (period as 'week' | 'month' | 'alltime')
      : 'week';

    const familyId = await this.leaderboardService.getUserFamilyId(
      req.user.id,
    );
    return this.leaderboardService.getRankings(familyId, selectedPeriod);
  }
}
