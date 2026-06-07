"use client";

// Procedurally synthesized bark sound effects for bot battles — no external
// audio files needed (and therefore nothing to download/license). Each bot
// difficulty gets its own "voice" built from oscillators + filtered noise
// bursts shaped with amplitude/frequency envelopes via the Web Audio API.

import { BotDifficulty } from "@/types";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

// Short burst of filtered noise — gives the bark its "breathy"/gravelly texture.
function createNoiseBurst(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

interface BarkVoice {
  /** Starting pitch of the tonal "woof" component (Hz) */
  startFreq: number;
  /** Pitch the tone falls to by the end of the bark (Hz) — barks always swoop downward */
  endFreq: number;
  /** Total length of a single bark, in seconds */
  duration: number;
  /** Bandpass filter center frequency — shapes the "size" of the animal */
  filterFreq: number;
  /** How resonant/growly the filter sounds */
  filterQ: number;
  /** Overall loudness (0-1) */
  gain: number;
  /** How many quick yips make up one "bark" (puppies yip in twos, Cerberus is a single roar) */
  yips: number;
  /** Gap between yips, in seconds */
  yipGap: number;
  /** Detune (cents) applied to a second layered oscillator — adds growl/menace */
  detune: number;
}

const VOICES: Record<BotDifficulty, BarkVoice> = {
  PUPPY: {
    startFreq: 1100,
    endFreq: 750,
    duration: 0.11,
    filterFreq: 1800,
    filterQ: 2,
    gain: 0.22,
    yips: 2,
    yipGap: 0.09,
    detune: 0,
  },
  GUARD_DOG: {
    startFreq: 520,
    endFreq: 260,
    duration: 0.18,
    filterFreq: 900,
    filterQ: 1.4,
    gain: 0.3,
    yips: 1,
    yipGap: 0,
    detune: 12,
  },
  ALPHA_WOLF: {
    startFreq: 320,
    endFreq: 140,
    duration: 0.3,
    filterFreq: 550,
    filterQ: 1.1,
    gain: 0.34,
    yips: 1,
    yipGap: 0,
    detune: 24,
  },
  CERBERUS: {
    startFreq: 200,
    endFreq: 80,
    duration: 0.4,
    filterFreq: 350,
    filterQ: 0.9,
    gain: 0.4,
    yips: 1,
    yipGap: 0,
    detune: 40,
  },
};

function scheduleSingleBark(ctx: AudioContext, voice: BarkVoice, when: number) {
  const { startFreq, endFreq, duration, filterFreq, filterQ, gain, detune } = voice;

  // Shared bandpass filter gives the whole bark its timbral "size"
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, when);
  master.gain.linearRampToValueAtTime(gain, when + duration * 0.12);
  master.gain.exponentialRampToValueAtTime(0.001, when + duration);

  filter.connect(master);
  master.connect(ctx.destination);

  // Tonal "woof" — a sawtooth swooping downward in pitch
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(startFreq, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), when + duration);
  osc.connect(filter);
  osc.start(when);
  osc.stop(when + duration + 0.02);

  // Layered detuned oscillator adds growl/menace for the bigger bots
  if (detune > 0) {
    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.detune.value = -detune;
    osc2.frequency.setValueAtTime(startFreq, when);
    osc2.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), when + duration);
    const g2 = ctx.createGain();
    g2.gain.value = 0.6;
    osc2.connect(g2);
    g2.connect(filter);
    osc2.start(when);
    osc2.stop(when + duration + 0.02);
  }

  // Noise burst gives breathy/gravelly texture under the tone
  const noise = createNoiseBurst(ctx, duration);
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.5;
  noise.connect(noiseGain);
  noiseGain.connect(filter);
  noise.start(when);
  noise.stop(when + duration);
}

const lastPlayed: Partial<Record<BotDifficulty, number>> = {};
const MIN_INTERVAL_MS = 450; // throttle so consecutive "barking" frames don't spam

/**
 * Play a synthesized bark for the given bot difficulty. Safe to call
 * frequently — internally throttled so it sounds like discrete barks rather
 * than a continuous drone.
 */
export function playBotBark(difficulty: BotDifficulty) {
  const ctx = getCtx();
  if (!ctx) return;

  const now = Date.now();
  const last = lastPlayed[difficulty] ?? 0;
  if (now - last < MIN_INTERVAL_MS) return;
  lastPlayed[difficulty] = now;

  const voice = VOICES[difficulty];
  const startTime = ctx.currentTime + 0.01;
  for (let i = 0; i < voice.yips; i++) {
    scheduleSingleBark(ctx, voice, startTime + i * (voice.duration + voice.yipGap));
  }
}

/** Plays a slightly more triumphant/longer bark — used for victory moments. */
export function playBotVictoryBark(difficulty: BotDifficulty) {
  const ctx = getCtx();
  if (!ctx) return;
  const voice = VOICES[difficulty];
  const startTime = ctx.currentTime + 0.01;
  // Three quick barks in a row to celebrate
  for (let i = 0; i < 3; i++) {
    scheduleSingleBark(ctx, voice, startTime + i * (voice.duration + 0.07));
  }
}
