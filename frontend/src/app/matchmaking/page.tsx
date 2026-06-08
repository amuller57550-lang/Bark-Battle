"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/hooks/useSocket";
import { Navbar } from "@/components/layout/Navbar";
import { BOT_CONFIG, BotDifficulty } from "@/types";
import { generateRoomCode } from "@/lib/utils";
import toast from "react-hot-toast";

type Mode = "ranked" | "private" | "bot" | null;

const DOTS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function MatchmakingContent() {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || null);
  const [searching, setSearching] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("GUARD_DOG");
  const { isConnected, emit, on } = useSocket("/matchmaking");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) router.push("/login");
  }, [user, hasHydrated, router]);

  // Waiting animation
  useEffect(() => {
    if (!searching) return;
    const t1 = setInterval(() => setWaitTime((w) => w + 1), 1000);
    const t2 = setInterval(() => setDotIndex((d) => (d + 1) % DOTS.length), 100);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [searching]);

  // Socket events
  useEffect(() => {
    const cleanup1 = on("match:found", ({ matchId }: { matchId: string }) => {
      toast.success("Adversaire trouvé ! 🐶");
      router.push(`/battle/${matchId}`);
    });

    const cleanup2 = on("match:error", ({ message }: { message: string }) => {
      toast.error(message);
      setSearching(false);
    });

    return () => {
      if (typeof cleanup1 === "function") cleanup1();
      if (typeof cleanup2 === "function") cleanup2();
    };
  }, [on, router]);

  const startRankedSearch = useCallback(() => {
    setSearching(true);
    setWaitTime(0);
    emit("matchmaking:join", { mode: "ranked", userId: user?.id });
  }, [emit, user]);

  const cancelSearch = useCallback(() => {
    setSearching(false);
    emit("matchmaking:leave");
  }, [emit]);

  const createPrivateRoom = useCallback(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    emit("matchmaking:create-room", { code, userId: user?.id });
  }, [emit, user]);

  const joinPrivateRoom = useCallback(() => {
    if (inputCode.length < 6) { toast.error("Code invalide"); return; }
    emit("matchmaking:join-room", { code: inputCode.toUpperCase(), userId: user?.id });
  }, [emit, user, inputCode]);

  const startBotMatch = useCallback(() => {
    router.push(`/battle/bot-${Date.now()}?difficulty=${botDifficulty}`);
  }, [router, botDifficulty]);

  if (!hasHydrated || !user) return null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8 page-enter">
        <div className="text-center">
          <h1 className="font-display text-5xl text-white mb-2">TROUVER UN MATCH</h1>
          <p className="text-bone-400">Choisis ton mode de jeu et prépare tes cordes vocales 🎤</p>
        </div>

        {/* Mode selector */}
        {!searching && (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { id: "ranked" as const, emoji: "⚔️", title: "CLASSÉ", desc: "Matchmaking automatique", sub: "Gagne des RP", color: "#f97316" },
              { id: "private" as const, emoji: "🏠", title: "PRIVÉ", desc: "Salon avec code", sub: "Joue avec un ami", color: "#a855f7" },
              { id: "bot" as const, emoji: "🤖", title: "BOT", desc: "Contre l'IA", sub: "Entraîne-toi", color: "#22c55e" },
            ].map((m) => (
              <motion.button
                key={m.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode(m.id)}
                className={`glass-card p-6 text-center space-y-3 transition-all ${mode === m.id ? "border-bark-500/60" : "hover:border-bone-600/40"}`}
                style={mode === m.id ? { borderColor: `${m.color}66`, background: `${m.color}11` } : {}}
              >
                <div className="text-4xl">{m.emoji}</div>
                <p className="font-display text-xl text-white" style={mode === m.id ? { color: m.color } : {}}>{m.title}</p>
                <p className="text-bone-400 text-sm">{m.desc}</p>
                <p className="text-xs font-semibold text-bone-500">{m.sub}</p>
              </motion.button>
            ))}
          </div>
        )}

        {/* Ranked searching */}
        <AnimatePresence mode="wait">
          {mode === "ranked" && !searching && (
            <motion.div key="ranked-ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card p-8 text-center space-y-6">
              <p className="text-5xl animate-float">🐕</p>
              <div>
                <h2 className="font-display text-3xl text-white mb-2">PARTIE CLASSÉE</h2>
                <p className="text-bone-400">Le matchmaking trouve un adversaire de ton niveau automatiquement.</p>
              </div>
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <p className="text-2xl font-black text-bark-400">{user.rp} RP</p>
                  <p className="text-xs text-bone-500">Ton rang actuel</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-green-400">~15s</p>
                  <p className="text-xs text-bone-500">Temps d'attente estimé</p>
                </div>
              </div>
              <button
                onClick={startRankedSearch}
                disabled={!isConnected}
                className="bg-bark-600 hover:bg-bark-500 disabled:opacity-50 text-white font-display text-xl px-10 py-4 rounded-2xl transition-all active:scale-95"
              >
                🔍 RECHERCHER
              </button>
            </motion.div>
          )}

          {mode === "ranked" && searching && (
            <motion.div key="ranked-searching" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-10 text-center space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-6xl inline-block"
              >
                🐾
              </motion.div>
              <div>
                <h2 className="font-display text-3xl text-bark-400">RECHERCHE EN COURS</h2>
                <p className="text-bone-400 mt-1">
                  {DOTS[dotIndex]} Temps d'attente : {waitTime}s
                </p>
              </div>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 2, 1] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                    className="w-2 h-6 bg-bark-500 rounded-full"
                  />
                ))}
              </div>
              <button
                onClick={cancelSearch}
                className="text-red-400 hover:text-red-300 font-semibold text-sm underline"
              >
                Annuler la recherche
              </button>
            </motion.div>
          )}

          {mode === "private" && (
            <motion.div key="private" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 space-y-6">
              <h2 className="font-display text-3xl text-white text-center">SALON PRIVÉ</h2>

              {/* Create room */}
              <div className="space-y-3">
                <h3 className="font-bold text-bone-300">Créer un salon</h3>
                {roomCode ? (
                  <div className="bg-bone-800 rounded-xl p-4 text-center">
                    <p className="text-bone-400 text-sm mb-2">Code du salon :</p>
                    <p className="font-display text-4xl text-bark-400 tracking-widest">{roomCode}</p>
                    <p className="text-xs text-bone-500 mt-2">Partage ce code à ton ami 🐶</p>
                  </div>
                ) : (
                  <button
                    onClick={createPrivateRoom}
                    className="w-full bg-paw-700/30 hover:bg-paw-700/50 border border-paw-600/30 text-paw-300 font-bold py-3 rounded-xl transition-all"
                  >
                    🏠 Créer un salon
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-bone-700" />
                <span className="text-bone-600 text-xs">OU</span>
                <div className="flex-1 h-px bg-bone-700" />
              </div>

              {/* Join room */}
              <div className="space-y-3">
                <h3 className="font-bold text-bone-300">Rejoindre un salon</h3>
                <div className="flex gap-2">
                  <input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="CODE123"
                    maxLength={6}
                    className="flex-1 bg-bone-800 border border-bone-700 focus:border-bark-500 rounded-xl py-3 px-4 text-white font-display text-xl text-center tracking-widest placeholder-bone-600 outline-none"
                  />
                  <button
                    onClick={joinPrivateRoom}
                    className="bg-bark-600 hover:bg-bark-500 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === "bot" && (
            <motion.div key="bot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 space-y-6">
              <h2 className="font-display text-3xl text-white text-center">CONTRE LE ROBOT</h2>
              <p className="text-center text-bone-400">Choisis la difficulté de ton adversaire</p>

              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(BOT_CONFIG) as BotDifficulty[]).map((diff) => {
                  const cfg = BOT_CONFIG[diff];
                  const isSelected = botDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => setBotDifficulty(diff)}
                      className={`glass-card p-4 text-left transition-all ${isSelected ? "border-bark-500/60 bg-bark-900/30" : "hover:border-bone-600/40"}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{cfg.emoji}</span>
                        <span className={`font-display text-lg ${isSelected ? "text-bark-400" : "text-white"}`}>{cfg.name}</span>
                      </div>
                      <p className="text-xs text-bone-400">{cfg.description}</p>
                      {/* Difficulty bar */}
                      <div className="mt-2 h-1.5 bg-bone-800 rounded-full overflow-hidden">
                        <div className="h-full bg-bark-500 rounded-full" style={{ width: `${cfg.aggressiveness * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={startBotMatch}
                className="w-full bg-bark-600 hover:bg-bark-500 text-white font-display text-xl py-4 rounded-2xl transition-all active:scale-95"
              >
                🤖 COMMENCER
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back */}
        {mode && !searching && (
          <button onClick={() => setMode(null)} className="text-bone-500 hover:text-white text-sm font-semibold transition-colors mx-auto block">
            ← Changer de mode
          </button>
        )}
      </main>
    </div>
  );
}

export default function MatchmakingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="text-4xl animate-pulse">🐾</span></div>}>
      <MatchmakingContent />
    </Suspense>
  );
}
