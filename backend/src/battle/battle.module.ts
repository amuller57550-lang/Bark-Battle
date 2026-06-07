import { Module } from '@nestjs/common';
import { BattleGateway } from './battle.gateway';
import { MatchesModule } from '../matches/matches.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MatchesModule, AuthModule, UsersModule],
  providers: [BattleGateway],
})
export class BattleModule {}
