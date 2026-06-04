import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { EloService } from '../elo/elo.service';
import { ScoringService } from '../scoring/scoring.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [MatchesController],
  providers: [MatchesService, EloService, ScoringService],
  exports: [MatchesService],
})
export class MatchesModule {}
