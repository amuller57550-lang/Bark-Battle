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
// Pre-match countdown beep — synthesized via the Web Audio API so we don't
// depend on an external sound file. A short, clean blip on "3"/"2"/"1" and a
// brighter, longer tone on "GO!" (count <= 0).
// ------------------------------------------------------------------

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedAudioCtx = new Ctor();
  }
  if (sharedAudioCtx.state === "suspended") void sharedAudioCtx.resume();
  return sharedAudioCtx;
}

/**
 * Plays a short synthesized beep for the pre-match countdown. Pass the
 * current countdown number (3, 2, 1, 0) — the "0"/"GO!" tick gets a higher,
 * longer, more energetic tone so the start of the round feels distinct.
 */
export function playCountdownBeep(count: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const isGo = count <= 0;
  const freq = isGo ? 880 : 523.25;
  const duration = isGo ? 0.35 : 0.16;
  const peak = isGo ? 0.32 : 0.22;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}
