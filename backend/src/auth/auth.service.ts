import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

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
