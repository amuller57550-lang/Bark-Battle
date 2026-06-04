import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private lb: LeaderboardService) {}

  @Get('global')
  getGlobal(@Query('page') page = '1', @Query('limit') limit = '100') {
    return this.lb.getGlobal(+page, +limit);
  }

  @Get('weekly')
  getWeekly() {
    return this.lb.getWeekly();
  }

  @Get('monthly')
  getMonthly() {
    return this.lb.getMonthly();
  }

  @Get('nearby')
  getNearby(@Request() req) {
    return this.lb.getNearby(req.user.id);
  }
}
