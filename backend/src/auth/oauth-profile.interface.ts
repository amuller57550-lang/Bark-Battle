// Normalized shape produced by every OAuth strategy's `validate()` — the
// controller/service only ever deal with this, never the raw provider profile.
export interface OAuthProfile {
  provider: 'google' | 'discord';
  providerId: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
}
