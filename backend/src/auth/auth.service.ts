import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthProfile } from './oauth-profile.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwt: JwtService,
  ) {}

  async register(username: string, email: string, password: string) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (exists) throw new ConflictException('Email ou pseudo déjà utilisé');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { username, email, passwordHash, rp: 500 },
      include: { badges: { include: { badge: true } } },
    });

    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { access_token: token, user: this.sanitize(user) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');
    if (user.isBanned) throw new UnauthorizedException('Compte banni');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { access_token: token, user: this.sanitize(user) };
  }

  // Find-or-create flow for Google logins. Matches an existing account by
  // provider id first, then by email (so a player who registered with
  // email+password can later link their Google account), and only creates a
  // brand new account as a last resort.
  async loginWithOAuth(profile: OAuthProfile) {
    const idField = 'googleId' as const;
    const include = { badges: { include: { badge: true } } };

    let user = await this.prisma.user.findFirst({
      where: { [idField]: profile.providerId },
      include,
    });

    if (!user && profile.email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include,
      });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            [idField]: profile.providerId,
            avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
          },
          include,
        });
      }
    }

    if (!user) {
      const username = await this.generateUniqueUsername(profile.username || profile.provider);
      const email = profile.email || `${profile.provider}-${profile.providerId}@bark.battle.local`;
      user = await this.prisma.user.create({
        data: {
          username,
          email,
          avatarUrl: profile.avatarUrl,
          rp: 500,
          [idField]: profile.providerId,
        },
        include,
      });
    }

    if (user.isBanned) throw new UnauthorizedException('Compte banni');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { access_token: token, user: this.sanitize(user) };
  }

  // Derives a unique username from the provider's display name (e.g. "Alpha Dog!"
  // -> "AlphaDog"), falling back to a random suffix on collision.
  private async generateUniqueUsername(base: string) {
    const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'Dresseur';
    let candidate = cleaned;
    for (let attempt = 0; attempt < 6; attempt++) {
      const taken = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!taken) return candidate;
      candidate = `${cleaned}${Math.floor(1000 + Math.random() * 9000)}`;
    }
    return `Dresseur${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async validateToken(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { badges: { include: { badge: true } } },
    });
    if (!user || user.isBanned) throw new UnauthorizedException();
    return user;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { badges: { include: { badge: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  private sanitize(user: any) {
    const { passwordHash, googleId, discordId, ...safe } = user;
    return safe;
  }
}
