import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { League } from '@prisma/client';

const RP_THRESHOLDS: Record<number, League> = {
  0: 'BRONZE_BONE',
  1000: 'SILVER_KENNEL',
  2000: 'GOLD_KIBBLE',
  3000: 'PLATINUM_JAW',
  4000: 'DIAMOND_ALPHA',
  5000: 'DOG_KING',
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { badges: { include: { badge: true } } },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async getStats(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    const total = user.wins + user.losses;
    return {
      wins: user.wins,
      losses: user.losses,
      winRate: total ? (user.wins / total) * 100 : 0,
      winStreak: user.winStreak,
      currentStreak: user.currentStreak,
      biggestBark: user.biggestBark,
      rp: user.rp,
      league: user.league,
    };
  }

  async updateLeague(userId: string, rp: number) {
    let newLeague: League = 'BRONZE_BONE';
    const thresholds = Object.keys(RP_THRESHOLDS)
      .map(Number)
      .sort((a, b) => b - a);

    for (const threshold of thresholds) {
      if (rp >= threshold) {
        newLeague = RP_THRESHOLDS[threshold];
        break;
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { rp, league: newLeague },
    });
  }

  async recordBark(userId: string, volume: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && volume > user.biggestBark) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { biggestBark: volume },
      });
    }
  }
}
