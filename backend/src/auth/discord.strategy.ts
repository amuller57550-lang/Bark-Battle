import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from './oauth-profile.interface';

interface DiscordProfile {
  id: string;
  username: string;
  avatar?: string | null;
  email?: string;
}

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(cfg: ConfigService) {
    super({
      clientID: cfg.get<string>('DISCORD_CLIENT_ID') || 'missing-discord-client-id',
      clientSecret: cfg.get<string>('DISCORD_CLIENT_SECRET') || 'missing-discord-client-secret',
      callbackURL:
        cfg.get<string>('DISCORD_CALLBACK_URL') ||
        'http://localhost:3001/api/auth/discord/callback',
      scope: ['identify', 'email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: DiscordProfile,
    done: (err: unknown, user?: OAuthProfile) => void,
  ) {
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : undefined;

    const oauthProfile: OAuthProfile = {
      provider: 'discord',
      providerId: profile.id,
      email: profile.email,
      username: profile.username,
      avatarUrl,
    };
    done(null, oauthProfile);
  }
}
