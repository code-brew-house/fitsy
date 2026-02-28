import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
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
      req.user.userId,
    );
    return this.leaderboardService.getRankings(familyId, selectedPeriod);
  }
}
