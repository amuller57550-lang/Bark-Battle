export type League =
  | "BRONZE_BONE"
  | "SILVER_KENNEL"
  | "GOLD_KIBBLE"
  | "PLATINUM_JAW"
  | "DIAMOND_ALPHA"
  | "DOG_KING";

export type BotDifficulty = "PUPPY" | "GUARD_DOG" | "ALPHA_WOLF" | "CERBERUS";

export type BonusType =
  | "CHIHUAHUA_BARK"
  | "GERMAN_SHEPHERD_RAGE"
  | "LUNAR_HOWL"
  | "DOMINANT_ALPHA"
  | "GOLDEN_RETRIEVER_JOY"
  | "HUSKY_DRAMATIC";

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  league: League;
  rp: number;
  wins: number;
  losses: number;
  winRate: number;
  biggestBark: number;
  winStreak: number;
  currentStreak: number;
  badges: Badge[];
  title?: string;
  frameEffect?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  unlockedAt: string;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  player1: User;
  player2: User;
  winnerId?: string;
  player1Score: number;
  player2Score: number;
  player1RpChange: number;
  player2RpChange: number;
  bonuses: BonusEvent[];
  duration: number;
  createdAt: string;
}

export interface BonusEvent {
  playerId: string;
  type: BonusType;
  multiplier: number;
  timestamp: number;
}

export interface BattleState {
  matchId: string;
  phase: "COUNTDOWN" | "BATTLE" | "ROUND_END" | "MATCH_END";
  round: number;
  timeLeft: number;
  player1: BattlePlayer;
  player2: BattlePlayer;
  bonuses: BonusEvent[];
  winner?: string;
}

export interface BattlePlayer {
  userId: string;
  username: string;
  avatarUrl?: string;
  currentVolume: number;
  peakVolume: number;
  avgVolume: number;
  barkDuration: number;
  score: number;
  bonusMultiplier: number;
  isBarking: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  league: League;
  rp: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
}

export interface MatchmakingState {
  status: "IDLE" | "SEARCHING" | "FOUND" | "CONNECTING";
  estimatedWait?: number;
  roomCode?: string;
  opponentId?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: "BADGE" | "TITLE" | "FRAME" | "EFFECT" | "ANIMATION";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  price: number;
  currency: "BONES" | "PREMIUM";
  preview?: string;
  isOwned?: boolean;
}

export interface AudioMetrics {
  volume: number;
  peak: number;
  average: number;
  isSpeaking: boolean;
  duration: number;
}

export const LEAGUE_CONFIG: Record<League, { name: string; color: string; minRP: number; maxRP: number; emoji: string }> = {
  BRONZE_BONE:     { name: "Os de Bronze",       color: "#cd7f32", minRP: 0,    maxRP: 999,  emoji: "🦴" },
  SILVER_KENNEL:   { name: "Niche d'Argent",     color: "#c0c0c0", minRP: 1000, maxRP: 1999, emoji: "🏠" },
  GOLD_KIBBLE:     { name: "Croquette d'Or",     color: "#ffd700", minRP: 2000, maxRP: 2999, emoji: "✨" },
  PLATINUM_JAW:    { name: "Mâchoire Platine",   color: "#e5e4e2", minRP: 3000, maxRP: 3999, emoji: "💎" },
  DIAMOND_ALPHA:   { name: "Alpha Diamant",      color: "#b9f2ff", minRP: 4000, maxRP: 4999, emoji: "💠" },
  DOG_KING:        { name: "Roi des Chiens",     color: "#ff6b35", minRP: 5000, maxRP: 99999, emoji: "👑" },
};

export const BOT_CONFIG: Record<BotDifficulty, { name: string; description: string; emoji: string; avgVolume: number; aggressiveness: number }> = {
  PUPPY:      { name: "Chiot",          description: "Un petit chiot adorable... mais menaçant.",      emoji: "🐶", avgVolume: 20, aggressiveness: 0.2 },
  GUARD_DOG:  { name: "Chien de Garde", description: "Protège son territoire avec conviction.",          emoji: "🐕", avgVolume: 50, aggressiveness: 0.5 },
  ALPHA_WOLF: { name: "Loup Alpha",     description: "Domine la meute. Redoutable.",                     emoji: "🐺", avgVolume: 75, aggressiveness: 0.75 },
  CERBERUS:   { name: "Cerbère",        description: "Gardien des Enfers. Trois têtes, une seule rage.", emoji: "🔥", avgVolume: 95, aggressiveness: 0.95 },
};

export const BONUS_CONFIG: Record<BonusType, { name: string; description: string; multiplier: number; emoji: string }> = {
  CHIHUAHUA_BARK:        { name: "Aboiement de Chihuahua",   description: "Petit mais BRUYANT !",         multiplier: 1.3, emoji: "🐕" },
  GERMAN_SHEPHERD_RAGE:  { name: "Rage du Berger Allemand",  description: "PUISSANCE MAXIMALE !",          multiplier: 1.5, emoji: "💢" },
  LUNAR_HOWL:            { name: "Hurlement Lunaire",         description: "La lune t'entend !",            multiplier: 1.4, emoji: "🌕" },
  DOMINANT_ALPHA:        { name: "Alpha Dominant",            description: "Tu règnes sur la meute !",      multiplier: 1.6, emoji: "👑" },
  GOLDEN_RETRIEVER_JOY:  { name: "Joie du Golden",           description: "Un bonheur contagieux !",       multiplier: 1.2, emoji: "🌟" },
  HUSKY_DRAMATIC:        { name: "Drama du Husky",           description: "Tellement dramatique !",        multiplier: 1.35, emoji: "🎭" },
};
