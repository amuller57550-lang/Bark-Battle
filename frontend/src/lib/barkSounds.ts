"use client";

// Real bark sound effects for bot battles — one distinct audio clip per bot
// difficulty (royalty-free, served from /public/sounds). Each clip is preloaded
// and pooled so overlapping triggers don't cut each other off, and playback is
// throttled so it sounds like discrete barks rather than a continuous mess.

import { BotDifficulty } from "@/types";

const BARK_SOURCES: Record<BotDifficulty, string> = {
  PUPPY: "/sounds/puppy-bark.mp3",
  GUARD_DOG: "/sounds/guard-dog-bark.mp3",
  ALPHA_WOLF: "/sounds/alpha-wolf-bark.mp3",
  CERBERUS: "/sounds/cerberus-bark.mp3",
};

// How loud each bot's clip plays (0-1) — lets us balance very different source
// recordings (e.g. a long growl vs. a short yip) against each other.
const BARK_VOLUME: Record<BotDifficulty, number> = {
  PUPPY: 0.55,
  GUARD_DOG: 0.6,
  ALPHA_WOLF: 0.6,
  CERBERUS: 0.65,
};

const POOL_SIZE = 3;
const pools: Partial<Record<BotDifficulty, HTMLAudioElement[]>> = {};

function getPool(difficulty: BotDifficulty): HTMLAudioElement[] {
  if (typeof window === "undefined") return [];
  let pool = pools[difficulty];
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio(BARK_SOURCES[difficulty]);
      audio.preload = "auto";
      audio.volume = BARK_VOLUME[difficulty];
      return audio;
    });
    pools[difficulty] = pool;
  }
  return pool;
}

function playFromPool(difficulty: BotDifficulty) {
  const pool = getPool(difficulty);
  if (!pool.length) return;
  // Reuse the element that's currently the most "finished" (paused/ended),
  // falling back to the first one if everything is mid-playback.
  const el = pool.find((a) => a.paused || a.ended) ?? pool[0];
  try {
    el.currentTime = 0;
    void el.play().catch(() => {});
  } catch {
    // Autoplay/decoding hiccup — ignore, next trigger will retry.
  }
}

const lastPlayed: Partial<Record<BotDifficulty, number>> = {};
const MIN_INTERVAL_MS = 700; // throttle so consecutive "barking" frames don't spam

/**
 * Play a real bark clip for the given bot difficulty. Safe to call
 * frequently — internally throttled so it sounds like discrete barks rather
 * than an overlapping mess.
 */
export function playBotBark(difficulty: BotDifficulty) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const last = lastPlayed[difficulty] ?? 0;
  if (now - last < MIN_INTERVAL_MS) return;
  lastPlayed[difficulty] = now;

  playFromPool(difficulty);
}

/**
 * Preload the bark clips for a given difficulty so the very first bark of a
 * match doesn't lag behind while the audio file downloads.
 */
export function preloadBotBark(difficulty: BotDifficulty) {
  getPool(difficulty);
}

// ------------------------------------------------------------------
// Pre-match countdown sound — plays a real audio clip on each tick of the
// 3-2-1 countdown (and on "GO!"). Pooled the same way as bark clips so a
// quick countdown can't cut its own previous tick off.
// ------------------------------------------------------------------

const COUNTDOWN_SOURCE = "/sounds/countdown-beep.mp3";
const COUNTDOWN_VOLUME = 0.6;
const COUNTDOWN_POOL_SIZE = 4;
let countdownPool: HTMLAudioElement[] | null = null;

function getCountdownPool(): HTMLAudioElement[] {
  if (typeof window === "undefined") return [];
  if (!countdownPool) {
    countdownPool = Array.from({ length: COUNTDOWN_POOL_SIZE }, () => {
      const audio = new Audio(COUNTDOWN_SOURCE);
      audio.preload = "auto";
      audio.volume = COUNTDOWN_VOLUME;
      return audio;
    });
  }
  return countdownPool;
}

/**
 * Plays the countdown sound. Pass the current countdown number (3, 2, 1, 0) —
 * the "0"/"GO!" tick plays a touch louder so the start of the round feels
 * more energetic.
 */
export function playCountdownBeep(count: number) {
  const pool = getCountdownPool();
  if (!pool.length) return;

  const el = pool.find((a) => a.paused || a.ended) ?? pool[0];
  try {
    el.currentTime = 0;
    el.volume = count <= 0 ? Math.min(1, COUNTDOWN_VOLUME + 0.15) : COUNTDOWN_VOLUME;
    void el.play().catch(() => {});
  } catch {
    // Autoplay/decoding hiccup — ignore, next tick will retry.
  }
}

/** Preload the countdown clip so the very first "3" doesn't lag. */
export function preloadCountdownBeep() {
  getCountdownPool();
}
