import { Module } from '@nestjs/common';
import { BattleGateway } from './battle.gateway';
import { MatchesModule } from '../matches/matches.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MatchesModule, AuthModule],
  providers: [BattleGateway],
})
export class BattleModule {}
