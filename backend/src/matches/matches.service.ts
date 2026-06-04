import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EloService } from '../elo/elo.service';
import { ScoringService, PlayerMetrics } from '../scoring/scoring.service';
import { UsersService } from '../users/users.service';

export interface FinalizeMatchDto {
  matchId: string;
  player1Id: string;
  player2Id: string;
  player1Metrics: PlayerMetrics;
  player2Metrics: PlayerMetrics;
  bonuses: unknown[];
  duration: number;
  isBot?: boolean;
  botDifficulty?: string;
}

@Injectable()
export class MatchesService {
  constructor(
    private prisma: PrismaService,
    private elo: EloService,
    private scoring: ScoringService,
    private users: UsersService,
  ) {}

  async createMatch(player1Id: string, player2Id: string) {
    return this.prisma.match.create({
      data: {
        player1Id,
        player2Id,
        player1Score: 0,
        player2Score: 0,
        player1Metrics: {},
        player2Metrics: {},
        duration: 0,
      },
    });
  }

  async finalizeMatch(dto: FinalizeMatchDto) {
    const { matchId, player1Id, player2Id, player1Metrics, player2Metrics } = dto;

    // Validate scores server-side
    const p1Suspicious = this.scoring.isSuspiciousScore(player1Metrics);
    const p2Suspicious = this.scoring.isSuspiciousScore(player2Metrics);

    const p1Score = this.scoring.calculateScore(player1Metrics);
    const p2Score = this.scoring.calculateScore(player2Metrics);

    const result = this.scoring.determineWinner(p1Score.final, p2Score.final);

    const [p1, p2] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: player1Id } }),
      !dto.isBot ? this.prisma.user.findUnique({ where: { id: player2Id } }) : null,
    ]);

    let p1RpChange = 0;
    let p2RpChange = 0;
    let winnerId: string | undefined;

    if (!dto.isBot && p1 && p2) {
      if (result === 'player1') {
        winnerId = player1Id;
        const changes = this.elo.calculateRpChanges(p1.rp, p2.rp);
        p1RpChange = changes.winnerChange;
        p2RpChange = changes.loserChange;
      } else if (result === 'player2') {
        winnerId = player2Id;
        const changes = this.elo.calculateRpChanges(p2.rp, p1.rp);
        p2RpChange = changes.winnerChange;
        p1RpChange = changes.loserChange;
      } else {
        const changes = this.elo.calculateRpChanges(p1.rp, p2.rp, true);
        p1RpChange = changes.winnerChange;
        p2RpChange = changes.loserChange;
      }
    } else if (dto.isBot && p1) {
      if (result === 'player1') {
        winnerId = player1Id;
        p1RpChange = 15;
      } else if (result === 'player2') {
        p1RpChange = -8;
      }
    }

    // Update match record
    const match = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        player1Score: p1Score.final,
        player2Score: p2Score.final,
        player1RpChange: p1Suspicious ? 0 : p1RpChange,
        player2RpChange: p2Suspicious ? 0 : p2RpChange,
        player1Metrics: player1Metrics as any,
        player2Metrics: player2Metrics as any,
        bonuses: dto.bonuses as any,
        duration: dto.duration,
      },
    });

    // Update player stats
    const updateTasks: Promise<unknown>[] = [];

    if (p1 && !p1Suspicious) {
      const newRP = Math.max(0, p1.rp + p1RpChange);
      const newWins = result === 'player1' ? p1.wins + 1 : p1.wins;
      const newLosses = result === 'player2' ? p1.losses + 1 : p1.losses;
      const newStreak = result === 'player1' ? p1.currentStreak + 1 : 0;
      const newWinStreak = Math.max(p1.winStreak, newStreak);

      updateTasks.push(
        this.users.updateLeague(player1Id, newRP),
        this.prisma.user.update({
          where: { id: player1Id },
          data: {
            wins: newWins,
            losses: newLosses,
            currentStreak: newStreak,
            winStreak: newWinStreak,
          },
        }),
        this.users.recordBark(player1Id, player1Metrics.peakVolume),
      );
    }

    if (p2 && !dto.isBot && !p2Suspicious) {
      const newRP = Math.max(0, p2.rp + p2RpChange);
      const newWins = result === 'player2' ? p2.wins + 1 : p2.wins;
      const newLosses = result === 'player1' ? p2.losses + 1 : p2.losses;
      const newStreak = result === 'player2' ? p2.currentStreak + 1 : 0;
      const newWinStreak = Math.max(p2.winStreak, newStreak);

      updateTasks.push(
        this.users.updateLeague(player2Id, newRP),
        this.prisma.user.update({
          where: { id: player2Id },
          data: {
            wins: newWins,
            losses: newLosses,
            currentStreak: newStreak,
            winStreak: newWinStreak,
          },
        }),
        this.users.recordBark(player2Id, player2Metrics.peakVolume),
      );
    }

    await Promise.all(updateTasks);

    return {
      match,
      winnerId,
      player1RpChange: p1Suspicious ? 0 : p1RpChange,
      player2RpChange: p2Suspicious ? 0 : p2RpChange,
      player1Score: p1Score.final,
      player2Score: p2Score.final,
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [matches, total] = await Promise.all([
      this.prisma.match.findMany({
        where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
        include: {
          player1: { select: { id: true, username: true, avatarUrl: true, league: true } },
          player2: { select: { id: true, username: true, avatarUrl: true, league: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.match.count({
        where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
      }),
    ]);

    return { matches, total, page, limit };
  }

  async getMatch(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, username: true, avatarUrl: true, league: true } },
        player2: { select: { id: true, username: true, avatarUrl: true, league: true } },
      },
    });
  }
}
