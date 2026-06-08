import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from './oauth-profile.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(cfg: ConfigService) {
    const options: StrategyOptions = {
      clientID: cfg.get<string>('GOOGLE_CLIENT_ID') || 'missing-google-client-id',
      clientSecret: cfg.get<string>('GOOGLE_CLIENT_SECRET') || 'missing-google-client-secret',
      callbackURL:
        cfg.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    };
    super(options);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; displayName?: string; emails?: { value: string }[]; photos?: { value: string }[] },
    done: VerifyCallback,
  ) {
    const oauthProfile: OAuthProfile = {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      username: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, oauthProfile);
  }
}
