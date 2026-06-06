"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuthStore } from "@/store/authStore";
import { AudioVisualizer } from "@/components/battle/AudioVisualizer";
import { BarkMeter } from "@/components/battle/BarkMeter";
import { VictoryScreen } from "@/components/battle/VictoryScreen";
import { BattleState, BonusEvent, BONUS_CONFIG, BOT_CONFIG, BotDifficulty } from "@/types";
import { calculateBotScore, calculateScore, rollRandomBonus } from "@/lib/scoring";
import toast from "react-hot-toast";

const ROUND_DURATION = 30;
const COUNTDOWN_DURATION = 3;

function BattleContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isBot = id.startsWith("bot-");
  const botDifficulty = (searchParams.get("difficulty") || "GUARD_DOG") as BotDifficulty;

  const { isActive, metrics, start, stop, error: micError } = useAudio();
  const { isConnected, emit, on, socket } = useSocket("/battle");
  const { initiate, answer, cleanup: cleanupRTC, remoteAudioRef } = useWebRTC(socket);

  const [phase, setPhase] = useState<"WAITING" | "COUNTDOWN" | "BATTLE" | "END">("WAITING");
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [rpChange, setRpChange] = useState(0);
  const [activeBonus, setActiveBonus] = useState<BonusEvent | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval>>(null!);
  const volumeAccRef = useRef<number[]>([]);
  const barkDurationRef = useRef(0);
  const lastBonusRef = useRef(0);

  // Init microphone on mount
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    start();
    return () => { stop(); cleanupRTC(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bot match init
  useEffect(() => {
    if (!isBot || !user) return;
    const botCfg = BOT_CONFIG[botDifficulty];
    const initialBattle: BattleState = {
      matchId: id,
      phase: "COUNTDOWN",
      round: 1,
      timeLeft: ROUND_DURATION,
      player1: {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        currentVolume: 0, peakVolume: 0, avgVolume: 0,
        barkDuration: 0, score: 0, bonusMultiplier: 1, isBarking: false,
      },
      player2: {
        userId: "bot",
        username: `🤖 ${botCfg.name}`,
        avatarUrl: undefined,
        currentVolume: 0, peakVolume: 0, avgVolume: 0,
        barkDuration: 0, score: 0, bonusMultiplier: 1, isBarking: false,
      },
      bonuses: [],
    };
    setBattle(initialBattle);
    startCountdown();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBot]);

  // Online match events
  useEffect(() => {
    if (isBot) return;

    const c1 = on("battle:state", (state: unknown) => {
      setBattle(state as BattleState);
    });

    const c2 = on("battle:start", () => startCountdown());

    const c3 = on("battle:volume-update", ({ playerId, volume }: { playerId: string; volume: number }) => {
      setBattle((prev) => {
        if (!prev) return prev;
        const key = prev.player1.userId === playerId ? "player1" : "player2";
        return {
          ...prev,
          [key]: { ...prev[key], currentVolume: volume, isBarking: volume > 10 },
        };
      });
    });

    const c4 = on("battle:bonus", (bonus: BonusEvent) => {
      showBonus(bonus);
    });

    const c5 = on("battle:end", ({ winner, rpChange: rp }: { winner: string; rpChange: number }) => {
      setRpChange(rp);
      setBattle((prev) => prev ? { ...prev, phase: "MATCH_END", winner } : prev);
      setPhase("END");
      clearInterval(timerRef.current);
    });

    const c6 = on("webrtc:offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      if (isActive && socket.current) {
        const stream = (await navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
        await answer(stream, id, offer);
      }
    });

    return () => {
      [c1, c2, c3, c4, c5, c6].forEach((c) => typeof c === "function" && c());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBot, isActive]);

  const startCountdown = useCallback(() => {
    setPhase("COUNTDOWN");
    let c = COUNTDOWN_DURATION;
    setCountdown(c);
    const t = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(t);
        startBattle();
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startBattle = useCallback(() => {
    setPhase("BATTLE");
    volumeAccRef.current = [];
    barkDurationRef.current = 0;
    lastBonusRef.current = 0;
    let t = ROUND_DURATION;
    setTimeLeft(t);

    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);

      if (t <= 0) {
        clearInterval(timerRef.current);
        endBattle();
      }
    }, 1000);
  }, []);

  // Volume tracking during battle
  useEffect(() => {
    if (phase !== "BATTLE") return;

    const vol = metrics.volume;
    volumeAccRef.current.push(vol);
    if (vol > 10) barkDurationRef.current += 0.1;

    // Emit volume to server
    if (!isBot) {
      emit("battle:volume", { matchId: id, volume: vol });
    }

    // Update local player state
    setBattle((prev) => {
      if (!prev) return prev;
      const p1 = prev.player1.userId === user?.id;
      const key = p1 ? "player1" : "player2";
      return {
        ...prev,
        [key]: {
          ...prev[key],
          currentVolume: vol,
          peakVolume: Math.max(prev[key].peakVolume, vol),
          isBarking: vol > 10,
        },
      };
    });

    // Bot simulation
    if (isBot) {
      const botCfg = BOT_CONFIG[botDifficulty];
      const botVol = Math.max(0, Math.min(100,
        botCfg.avgVolume + (Math.random() - 0.5) * 30 * botCfg.aggressiveness
      ));
      setBattle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          player2: {
            ...prev.player2,
            currentVolume: botVol,
            peakVolume: Math.max(prev.player2.peakVolume, botVol),
            isBarking: botVol > 10,
          },
        };
      });
    }

    // Random bonus check every ~5s
    const now = Date.now();
    if (now - lastBonusRef.current > 5000 && vol > 15) {
      const bonusType = rollRandomBonus(vol);
      if (bonusType) {
        lastBonusRef.current = now;
        const bonus: BonusEvent = {
          playerId: user?.id || "",
          type: bonusType,
          multiplier: BONUS_CONFIG[bonusType].multiplier,
          timestamp: now,
        };
        showBonus(bonus);
        if (!isBot) emit("battle:bonus", { matchId: id, bonus });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.volume, phase]);

  const showBonus = useCallback((bonus: BonusEvent) => {
    setActiveBonus(bonus);
    const cfg = BONUS_CONFIG[bonus.type];
    toast.success(`${cfg.emoji} ${cfg.name}! ×${cfg.multiplier}`, { duration: 2500 });
    setTimeout(() => setActiveBonus(null), 2500);
  }, []);

  const endBattle = useCallback(() => {
    if (!battle || !user) return;
    clearInterval(timerRef.current);

    const vols = volumeAccRef.current;
    const avg = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
    const peak = Math.max(...vols, 0);
    const consistency = vols.length > 0 ? vols.filter((v) => v > 10).length / vols.length : 0;

    const myScore = calculateScore({
      avgVolume: avg,
      peakVolume: peak,
      barkDuration: barkDurationRef.current,
      consistency,
      bonuses: battle.bonuses
        .filter((b) => b.playerId === user.id)
        .map((b) => ({ type: b.type, multiplier: b.multiplier })),
    });

    if (isBot) {
      const botMetrics = calculateBotScore(botDifficulty, ROUND_DURATION);
      const botScore = calculateScore(botMetrics);
      const iWin = myScore.final > botScore.final;

      setBattle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: "MATCH_END",
          player1: { ...prev.player1, score: myScore.final },
          player2: { ...prev.player2, score: botScore.final },
          winner: iWin ? user.id : "bot",
        };
      });
      setRpChange(iWin ? 15 : -10);
    }

    setPhase("END");
  }, [battle, user, isBot, botDifficulty]);

  const handlePlayAgain = useCallback(() => {
    router.push("/matchmaking");
  }, [router]);

  if (!user || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="text-6xl">🐾</motion.div>
          <p className="text-bone-400 font-semibold">Connexion au match...</p>
        </div>
      </div>
    );
  }

  const myPlayer = battle.player1.userId === user.id ? battle.player1 : battle.player2;
  const oppPlayer = battle.player1.userId === user.id ? battle.player2 : battle.player1;

  return (
    <div className="min-h-screen bg-arena-gradient relative overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* Ambient glow based on volume */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-100"
        style={{
          background: `radial-gradient(ellipse at center, rgba(249,115,22,${metrics.volume / 500}) 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-display text-lg text-bone-400 flex items-center gap-2">
            <span>🐾</span> BARK BATTLE
          </div>

          {/* Timer */}
          <motion.div
            className="glass-card px-6 py-2 text-center"
            animate={timeLeft <= 10 && phase === "BATTLE" ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
          >
            <p className={`font-display text-3xl ${timeLeft <= 10 && phase === "BATTLE" ? "text-red-400" : "text-white"}`}>
              {timeLeft}s
            </p>
            <p className="text-xs text-bone-500">MANCHE {battle.round}</p>
          </motion.div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="glass-card p-3 hover:border-bone-600/40 transition-all"
            >
              {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-bone-300" />}
            </button>
            <div className={`glass-card p-3 ${isActive ? "border-green-500/40" : "border-red-500/40"}`}>
              {isActive ? <Mic size={18} className="text-green-400" /> : <MicOff size={18} className="text-red-400" />}
            </div>
          </div>
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {phase === "COUNTDOWN" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="font-display text-9xl text-bark-400 neon-text"
              >
                {countdown > 0 ? countdown : "🐕 ABOIE !"}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active bonus banner */}
        <AnimatePresence>
          {activeBonus && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-4 text-center border-bark-500/50"
              style={{ background: "rgba(249,115,22,0.15)" }}
            >
              <p className="font-display text-2xl text-bark-400">
                {BONUS_CONFIG[activeBonus.type].emoji} {BONUS_CONFIG[activeBonus.type].name}
              </p>
              <p className="text-bone-300 text-sm">×{BONUS_CONFIG[activeBonus.type].multiplier} multiplicateur !</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle arena */}
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {/* My side */}
          <div className="space-y-4">
            <div className="glass-card p-4 text-center">
              <div className={`text-3xl mb-1 ${myPlayer.isBarking ? "animate-bark-pulse" : ""}`}>
                {myPlayer.isBarking ? "🐕" : "😐"}
              </div>
              <p className="font-bold text-white text-sm truncate">{myPlayer.username}</p>
              <p className="font-display text-2xl text-bark-400">{Math.round(myPlayer.score)}</p>
            </div>

            <BarkMeter volume={metrics.volume} peak={metrics.peak} side="left" />
            <AudioVisualizer
              frequencyData={metrics.frequencyData}
              volume={metrics.volume}
              color="#f97316"
              className="h-16"
            />
          </div>

          {/* Divider */}
          <div className="hidden md:flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="font-display text-4xl text-bone-600">VS</p>
              <div className="w-px h-32 bg-gradient-to-b from-transparent via-bone-700 to-transparent mx-auto" />
            </div>
          </div>

          {/* Opponent side */}
          <div className="space-y-4">
            <div className="glass-card p-4 text-center">
              <div className={`text-3xl mb-1 ${oppPlayer.isBarking ? "animate-bark-pulse" : ""}`}>
                {oppPlayer.isBarking ? "🐶" : "😐"}
              </div>
              <p className="font-bold text-white text-sm truncate">{oppPlayer.username}</p>
              <p className="font-display text-2xl text-bark-400">{Math.round(oppPlayer.score)}</p>
            </div>

            <BarkMeter volume={oppPlayer.currentVolume} peak={oppPlayer.peakVolume} side="right" />
            <AudioVisualizer
              frequencyData={null}
              volume={oppPlayer.currentVolume}
              color="#a855f7"
              className="h-16"
            />
          </div>
        </div>

        {/* Stats during battle */}
        {phase === "BATTLE" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "Volume moyen", value: `${Math.round(metrics.volume)}%` },
              { label: "Pic sonore", value: `${metrics.peak}%` },
              { label: "Durée d'aboiement", value: `${Math.round(barkDurationRef.current)}s` },
            ].map((s) => (
              <div key={s.label} className="glass-card p-3 text-center">
                <p className="text-xs text-bone-500">{s.label}</p>
                <p className="font-bold text-bark-400">{s.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Mic error */}
        {micError && (
          <div className="glass-card p-4 border-red-500/30 text-center">
            <p className="text-red-400 text-sm">⚠️ {micError}</p>
            <button onClick={start} className="text-bark-400 text-xs font-semibold mt-1 hover:text-bark-300">
              Réessayer l'accès au micro
            </button>
          </div>
        )}
      </div>

      {/* Victory screen */}
      {phase === "END" && battle && (
        <VictoryScreen
          battle={battle}
          currentUserId={user.id}
          rpChange={rpChange}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="text-4xl animate-pulse">🐾</span></div>}>
      <BattleContent />
    </Suspense>
  );
}
