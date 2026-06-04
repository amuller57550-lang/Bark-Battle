import { Module } from '@nestjs/common';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchesModule } from '../matches/matches.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MatchesModule, AuthModule],
  providers: [MatchmakingGateway],
})
export class MatchmakingModule {}
