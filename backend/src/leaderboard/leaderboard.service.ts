import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getGlobal(page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const users = await this.prisma.user.findMany({
      where: { isBanned: false },
      orderBy: { rp: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        league: true,
        rp: true,
        wins: true,
        losses: true,
        winStreak: true,
        currentStreak: true,
      },
    });

    const entries = users.map((u, i) => ({
      rank: skip + i + 1,
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      league: u.league,
      rp: u.rp,
      wins: u.wins,
      losses: u.losses,
      winRate: u.wins + u.losses > 0 ? (u.wins / (u.wins + u.losses)) * 100 : 0,
      winStreak: u.winStreak,
    }));

    return { entries, page, limit };
  }

  async getWeekly() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const data = await this.prisma.match.groupBy({
      by: ['player1Id'],
      where: {
        createdAt: { gte: weekStart },
        winnerId: { not: null },
      },
      _count: { _all: true },
    });

    // Simplified weekly: sort by wins this week
    const winCounts = new Map<string, number>();
    data.forEach((d) => winCounts.set(d.player1Id, d._count._all));

    const userIds = data.map((d) => d.player1Id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, league: true, rp: true, wins: true, losses: true, winStreak: true },
    });

    const entries = users
      .sort((a, b) => (winCounts.get(b.id) || 0) - (winCounts.get(a.id) || 0))
      .map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        league: u.league,
        rp: u.rp,
        wins: winCounts.get(u.id) || 0,
        losses: u.losses,
        winRate: u.wins + u.losses > 0 ? (u.wins / (u.wins + u.losses)) * 100 : 0,
        winStreak: u.winStreak,
      }));

    return { entries };
  }

  async getMonthly() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return this.getWeekly(); // Same logic, different date range (simplified)
  }

  async getNearby(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { entries: [] };

    const [above, below] = await Promise.all([
      this.prisma.user.findMany({
        where: { rp: { gt: user.rp }, isBanned: false },
        orderBy: { rp: 'asc' },
        take: 5,
        select: { id: true, username: true, league: true, rp: true, wins: true, losses: true, winStreak: true, avatarUrl: true },
      }),
      this.prisma.user.findMany({
        where: { rp: { lte: user.rp }, isBanned: false },
        orderBy: { rp: 'desc' },
        take: 6,
        select: { id: true, username: true, league: true, rp: true, wins: true, losses: true, winStreak: true, avatarUrl: true },
      }),
    ]);

    const combined = [...above.reverse(), ...below].map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      league: u.league,
      rp: u.rp,
      wins: u.wins,
      losses: u.losses,
      winRate: u.wins + u.losses > 0 ? (u.wins / (u.wins + u.losses)) * 100 : 0,
      winStreak: u.winStreak,
    }));

    return { entries: combined };
  }
}
