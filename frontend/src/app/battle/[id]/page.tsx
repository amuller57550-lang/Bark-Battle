"use client";
export const dynamic = 'force-dynamic';

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
import { playBotBark, playBotVictoryBark } from "@/lib/barkSounds";
import toast from "react-hot-toast";

const ROUND_DURATION = 10;
const COUNTDOWN_DURATION = 3;

function BattleContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isBot = id.startsWith("bot-");
  const botDifficulty = (searchParams.get("difficulty") || "GUARD_DOG") as BotDifficulty;

  const { isActive, metrics, start, stop, error: micError, getStream } = useAudio();
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
  const battleRef = useRef<BattleState | null>(null);
  const battleInitRef = useRef(false);
  const rtcStartedRef = useRef(false);

  // Keep battleRef in sync with current battle state
  useEffect(() => { battleRef.current = battle; }, [battle]);

  // Init microphone on mount
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    start();
    return () => { stop(); cleanupRTC(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emit battle:join for online matches when socket connects
  useEffect(() => {
    if (isBot || !isConnected || !user) return;
    emit("battle:join", { matchId: id, userId: user.id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isBot]);

  // Self-healing: if we never receive battle:start (missed broadcast / race condition),
  // keep re-announcing ourselves so the server can resend battle:start directly to us.
  useEffect(() => {
    if (isBot || !user) return;
    const retry = setInterval(() => {
      if (battleRef.current) { clearInterval(retry); return; }
      if (isConnected) emit("battle:join", { matchId: id, userId: user.id });
    }, 3000);
    return () => clearInterval(retry);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBot, isConnected]);

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

    const c2 = on("battle:start", (data: unknown) => {
      const {
        player1Id, player2Id,
        player1Username, player1AvatarUrl,
        player2Username, player2AvatarUrl,
      } = data as {
        player1Id: string; player2Id: string;
        player1Username?: string; player1AvatarUrl?: string | null;
        player2Username?: string; player2AvatarUrl?: string | null;
      };
      // Guard synchronously with a ref — setBattle's updater isn't guaranteed
      // to run before the next line, so we can't rely on a flag set inside it.
      if (battleInitRef.current || battleRef.current || !user) return;
      battleInitRef.current = true;

      const isP1 = player1Id === user.id;
      const initialBattle: BattleState = {
        matchId: id,
        phase: "COUNTDOWN",
        round: 1,
        timeLeft: ROUND_DURATION,
        player1: {
          userId: player1Id,
          username: isP1 ? user.username : (player1Username || "Adversaire"),
          avatarUrl: (isP1 ? user.avatarUrl : player1AvatarUrl) || undefined,
          currentVolume: 0, peakVolume: 0, avgVolume: 0,
          barkDuration: 0, score: 0, bonusMultiplier: 1, isBarking: false,
        },
        player2: {
          userId: player2Id,
          username: !isP1 ? user.username : (player2Username || "Adversaire"),
          avatarUrl: (!isP1 ? user.avatarUrl : player2AvatarUrl) || undefined,
          currentVolume: 0, peakVolume: 0, avgVolume: 0,
          barkDuration: 0, score: 0, bonusMultiplier: 1, isBarking: false,
        },
        bonuses: [],
      };
      battleRef.current = initialBattle;
      setBattle(initialBattle);
      startCountdown();
    });

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

    const c5 = on("battle:end", (data: unknown) => {
      const { winner, player1Score, player2Score, player1RpChange, player2RpChange } = data as {
        winner: string; player1Score: number; player2Score: number;
        player1RpChange: number; player2RpChange: number;
      };
      setBattle((prev) => {
        if (!prev) return prev;
        const isP1 = prev.player1.userId === user?.id;
        setRpChange(isP1 ? player1RpChange : player2RpChange);
        return {
          ...prev,
          phase: "MATCH_END",
          winner,
          player1: { ...prev.player1, score: player1Score },
          player2: { ...prev.player2, score: player2Score },
        };
      });
      setPhase("END");
      clearInterval(timerRef.current);
    });

    const c6 = on("webrtc:offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      if (socket.current) {
        const stream = getStream() || (await navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
        await answer(stream, id, offer);
      }
    });

    return () => {
      [c1, c2, c3, c4, c5, c6].forEach((c) => typeof c === "function" && c());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBot]);

  // WebRTC: once the match is known and the mic is ready, the designated
  // "initiator" (player1) creates the offer so both players hear each other.
  // The other side just waits for webrtc:offer (handled by c6 above) and answers.
  useEffect(() => {
    if (isBot || !battle || !user || !isActive || rtcStartedRef.current) return;
    if (battle.player1.userId !== user.id) return; // only the initiator opens the connection
    const stream = getStream();
    if (!stream) return;
    rtcStartedRef.current = true;
    initiate(stream, id);
  }, [isBot, battle, user, isActive, getStream, initiate, id]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Play a bot-specific bark sound whenever the bot is "barking" — each
      // difficulty has its own synthesized voice (see lib/barkSounds.ts), and
      // playback is internally throttled so it sounds like discrete barks.
      if (botVol > 10) {
        playBotBark(botDifficulty);
      }
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
    const currentBattle = battleRef.current;
    if (!currentBattle || !user) return;
    clearInterval(timerRef.current);

    if (isBot) {
      const vols = volumeAccRef.current;
      const avg = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
      const peak = Math.max(...vols, 0);
      const consistency = vols.length > 0 ? vols.filter((v) => v > 10).length / vols.length : 0;

      const myScore = calculateScore({
        avgVolume: avg,
        peakVolume: peak,
        barkDuration: barkDurationRef.current,
        consistency,
        bonuses: currentBattle.bonuses
          .filter((b) => b.playerId === user.id)
          .map((b) => ({ type: b.type, multiplier: b.multiplier })),
      });

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
      setPhase("END");
      if (!iWin) playBotVictoryBark(botDifficulty);
    }
    // For online matches, wait for the server's authoritative `battle:end`
    // event (handled by c5) which carries the real scores/winner/RP — setting
    // phase to "END" here would show the victory screen prematurely with
    // empty/placeholder data.
  }, [user, isBot, botDifficulty]);

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
      <audio ref={remoteAudioRef} autoPlay muted={isMuted} className="hidden" />

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
