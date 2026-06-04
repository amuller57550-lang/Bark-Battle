"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BattleState } from "@/types";
import { formatRPChange, getRPColor } from "@/lib/utils";
import Link from "next/link";

interface VictoryScreenProps {
  battle: BattleState;
  currentUserId: string;
  rpChange: number;
  onPlayAgain: () => void;
}

const confettiColors = ["#f97316", "#fbbf24", "#ef4444", "#a855f7", "#22c55e", "#3b82f6"];

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          initial={{
            x: `${Math.random() * 100}vw`,
            y: -20,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: "110vh",
            rotate: Math.random() * 720 - 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 1.5,
            ease: "easeIn",
          }}
          style={{ background: confettiColors[i % confettiColors.length] }}
        />
      ))}
    </div>
  );
}

export function VictoryScreen({ battle, currentUserId, rpChange, onPlayAgain }: VictoryScreenProps) {
  const isWinner = battle.winner === currentUserId;
  const isDraw = !battle.winner;

  const p1 = battle.player1;
  const p2 = battle.player2;
  const me = p1.userId === currentUserId ? p1 : p2;
  const opponent = p1.userId === currentUserId ? p2 : p1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      {isWinner && <Confetti />}

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative max-w-lg w-full mx-4"
      >
        <div className="glass-card p-8 text-center space-y-6">
          {/* Result banner */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-7xl mb-3">
              {isDraw ? "🤝" : isWinner ? "🏆" : "💀"}
            </div>
            <h1 className={`font-display text-5xl ${isDraw ? "text-yellow-400" : isWinner ? "text-bark-400" : "text-red-400"} neon-text`}>
              {isDraw ? "ÉGALITÉ !" : isWinner ? "VICTOIRE !" : "DÉFAITE !"}
            </h1>
          </motion.div>

          {/* Score comparison */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 items-center gap-4 bg-bone-800/50 rounded-2xl p-4"
          >
            <div className="text-center">
              <p className="text-xs text-bone-400 font-semibold mb-1">MOI</p>
              <p className="font-bold text-white text-sm truncate">{me.username}</p>
              <p className="font-display text-3xl text-bark-400">{Math.round(me.score)}</p>
            </div>

            <div className="text-center">
              <p className="font-display text-2xl text-bone-500">VS</p>
            </div>

            <div className="text-center">
              <p className="text-xs text-bone-400 font-semibold mb-1">ADVERSAIRE</p>
              <p className="font-bold text-white text-sm truncate">{opponent.username}</p>
              <p className="font-display text-3xl text-bark-400">{Math.round(opponent.score)}</p>
            </div>
          </motion.div>

          {/* RP change */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="inline-flex items-center gap-2 bg-bone-800 px-6 py-3 rounded-2xl"
          >
            <span className="text-bone-400 font-semibold">Points de rang</span>
            <span className={`font-display text-2xl ${getRPColor(rpChange)}`}>
              {formatRPChange(rpChange)}
            </span>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3"
          >
            <button
              onClick={onPlayAgain}
              className="flex-1 bg-bark-600 hover:bg-bark-500 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
            >
              🎮 Rejouer
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-bone-700 hover:bg-bone-600 text-white font-bold py-3 px-6 rounded-xl transition-all text-center active:scale-95"
            >
              🏠 Accueil
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
