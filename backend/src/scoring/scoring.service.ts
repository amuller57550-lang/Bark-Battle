import { Injectable } from '@nestjs/common';

export interface PlayerMetrics {
  avgVolume: number;
  peakVolume: number;
  barkDuration: number;
  consistency: number;
  bonusMultiplier: number;
}

export interface ScoreResult {
  base: number;
  final: number;
  breakdown: {
    intensity: number;
    peak: number;
    duration: number;
    consistency: number;
    bonus: number;
  };
}

const WEIGHTS = { intensity: 0.35, peak: 0.25, duration: 0.25, consistency: 0.15 };
const ROUND_DURATION = 10;

// Anti-cheat thresholds
const MAX_VALID_PEAK = 100;
const MIN_CONSISTENCY = 0;
const MAX_CONSISTENCY = 1;

@Injectable()
export class ScoringService {
  calculateScore(metrics: PlayerMetrics): ScoreResult {
    // Validate and clamp all inputs (anti-cheat)
    const avgVolume = Math.max(0, Math.min(100, metrics.avgVolume));
    const peakVolume = Math.max(0, Math.min(MAX_VALID_PEAK, metrics.peakVolume));
    const barkDuration = Math.max(0, Math.min(ROUND_DURATION, metrics.barkDuration));
    const consistency = Math.max(MIN_CONSISTENCY, Math.min(MAX_CONSISTENCY, metrics.consistency));
    const bonusMultiplier = Math.max(1, Math.min(3, metrics.bonusMultiplier));

    const intensity = Math.round(avgVolume * WEIGHTS.intensity);
    const peak = Math.round(peakVolume * WEIGHTS.peak);
    const duration = Math.round((barkDuration / ROUND_DURATION) * 100 * WEIGHTS.duration);
    const cons = Math.round(consistency * 100 * WEIGHTS.consistency);

    const base = intensity + peak + duration + cons;
    const final = Math.round(base * bonusMultiplier);

    return {
      base,
      final,
      breakdown: {
        intensity,
        peak,
        duration,
        consistency: cons,
        bonus: Math.round((bonusMultiplier - 1) * base),
      },
    };
  }

  determineWinner(
    score1: number,
    score2: number,
  ): 'player1' | 'player2' | 'draw' {
    const diff = Math.abs(score1 - score2);
    if (diff < 2) return 'draw';
    return score1 > score2 ? 'player1' : 'player2';
  }

  /**
   * Server-side validation: detect implausible scores (pre-recorded audio, bots, etc.)
   * Volume should correlate with duration. If someone claims 100% avg volume for 30s, flag it.
   */
  isSuspiciousScore(metrics: PlayerMetrics): boolean {
    if (metrics.avgVolume > 98 && metrics.barkDuration > 25) return true;
    if (metrics.peakVolume < metrics.avgVolume) return true;
    if (metrics.consistency > 0.99 && metrics.avgVolume > 80) return true;
    return false;
  }
}
