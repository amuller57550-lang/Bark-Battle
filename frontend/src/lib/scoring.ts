import { BonusType, BONUS_CONFIG } from "@/types";

export interface RoundScore {
  avgVolume: number;
  peakVolume: number;
  barkDuration: number;
  consistency: number;
  bonuses: { type: BonusType; multiplier: number }[];
}

export interface ScoreResult {
  base: number;
  bonusMultiplier: number;
  final: number;
  breakdown: {
    intensity: number;
    peak: number;
    duration: number;
    consistency: number;
    bonusTotal: number;
  };
}

const SCORE_WEIGHTS = {
  intensity: 0.35,
  peak: 0.25,
  duration: 0.25,
  consistency: 0.15,
};

export function calculateScore(metrics: RoundScore): ScoreResult {
  const intensityScore = Math.min(100, metrics.avgVolume);
  const peakScore = Math.min(100, metrics.peakVolume);
  const durationScore = Math.min(100, (metrics.barkDuration / 30) * 100);
  const consistencyScore = Math.min(100, metrics.consistency * 100);

  const base = Math.round(
    intensityScore * SCORE_WEIGHTS.intensity +
    peakScore * SCORE_WEIGHTS.peak +
    durationScore * SCORE_WEIGHTS.duration +
    consistencyScore * SCORE_WEIGHTS.consistency
  );

  let bonusMultiplier = 1.0;
  const bonusTotal = metrics.bonuses.reduce((acc, b) => {
    bonusMultiplier *= b.multiplier;
    return acc + (b.multiplier - 1) * 100;
  }, 0);

  const final = Math.round(base * bonusMultiplier);

  return {
    base,
    bonusMultiplier,
    final,
    breakdown: {
      intensity: Math.round(intensityScore * SCORE_WEIGHTS.intensity),
      peak: Math.round(peakScore * SCORE_WEIGHTS.peak),
      duration: Math.round(durationScore * SCORE_WEIGHTS.duration),
      consistency: Math.round(consistencyScore * SCORE_WEIGHTS.consistency),
      bonusTotal: Math.round(bonusTotal),
    },
  };
}

export function rollRandomBonus(volume: number): BonusType | null {
  const bonusTypes = Object.keys(BONUS_CONFIG) as BonusType[];
  const probability = Math.min(0.35, volume / 300);

  if (Math.random() > probability) return null;

  if (volume > 90 && Math.random() < 0.3) return "DOMINANT_ALPHA";
  if (volume > 80 && Math.random() < 0.25) return "GERMAN_SHEPHERD_RAGE";
  if (volume > 70 && Math.random() < 0.3) return "LUNAR_HOWL";
  if (volume < 30 && Math.random() < 0.4) return "CHIHUAHUA_BARK";

  return bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
}

export function calculateBotScore(difficulty: string, roundDuration: number): RoundScore {
  const configs: Record<string, { avg: number; variance: number }> = {
    PUPPY:      { avg: 20, variance: 10 },
    GUARD_DOG:  { avg: 50, variance: 15 },
    ALPHA_WOLF: { avg: 75, variance: 10 },
    CERBERUS:   { avg: 92, variance: 5 },
  };

  const cfg = configs[difficulty] || configs.PUPPY;
  const avgVolume = Math.max(5, Math.min(100, cfg.avg + (Math.random() - 0.5) * cfg.variance * 2));
  const peakVolume = Math.min(100, avgVolume * (1.1 + Math.random() * 0.3));
  const barkDuration = roundDuration * (0.6 + Math.random() * 0.35);
  const consistency = 0.5 + Math.random() * 0.45;

  const bonuses: { type: BonusType; multiplier: number }[] = [];
  const bonusRoll = rollRandomBonus(avgVolume);
  if (bonusRoll) {
    bonuses.push({ type: bonusRoll, multiplier: BONUS_CONFIG[bonusRoll].multiplier });
  }

  return { avgVolume, peakVolume, barkDuration, consistency, bonuses };
}

export function determineWinner(score1: number, score2: number): "player1" | "player2" | "draw" {
  const diff = Math.abs(score1 - score2);
  if (diff < 2) return "draw";
  return score1 > score2 ? "player1" : "player2";
}
