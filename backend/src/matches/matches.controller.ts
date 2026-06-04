import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matches: MatchesService) {}

  @Get('history')
  getHistory(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.matches.getHistory(req.user.id, +page, +limit);
  }

  @Get(':id')
  getMatch(@Param('id') id: string) {
    return this.matches.getMatch(id);
  }
}
