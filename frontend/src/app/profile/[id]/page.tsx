"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Zap, TrendingUp, Shield, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { RankBadge } from "@/components/ui/RankBadge";
import { usersAPI, matchesAPI } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { User, Match } from "@/types";
import { formatRPChange, getRPColor, formatWinRate, getLeagueConfig } from "@/lib/utils";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const isMe = me?.id === id;

  useEffect(() => {
    Promise.all([
      usersAPI.getProfile(id),
      matchesAPI.getHistory(1, 20),
    ])
      .then(([profileRes, matchRes]) => {
        setProfile(profileRes.data);
        setMatches(matchRes.data.matches || []);
      })
      .catch(() => {
        if (me && isMe) setProfile(me);
      })
      .finally(() => setLoading(false));
  }, [id, me, isMe]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="text-5xl">🐾</motion.div>
        </div>
      </div>
    );
  }

  const user = profile || me;
  if (!user) return null;

  const leagueConfig = getLeagueConfig(user.league);

  const stats = [
    { icon: Trophy, label: "Victoires", value: user.wins, color: "#fbbf24" },
    { icon: Shield, label: "Défaites", value: user.losses, color: "#ef4444" },
    { icon: TrendingUp, label: "Win Rate", value: formatWinRate(user.wins, user.losses), color: "#22c55e" },
    { icon: Zap, label: "Pic sonore", value: `${user.biggestBark}%`, color: "#a855f7" },
    { icon: Clock, label: "Série record", value: `${user.winStreak}🔥`, color: "#f97316" },
    { icon: Trophy, label: "RP Total", value: user.rp, color: leagueConfig.color },
  ];

  const rarityColors: Record<string, string> = {
    COMMON: "#78716c", RARE: "#3b82f6", EPIC: "#a855f7", LEGENDARY: "#f97316",
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6 page-enter">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8"
          style={{ borderColor: `${leagueConfig.color}33` }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl league-shine flex-shrink-0"
                style={{ background: `${leagueConfig.color}22`, border: `3px solid ${leagueConfig.color}66` }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  leagueConfig.emoji
                )}
              </div>
              <div
                className="absolute -bottom-2 -right-2 text-xl w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: leagueConfig.color }}
              >
                {leagueConfig.emoji}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h1 className="font-display text-4xl text-white">{user.username}</h1>
                {user.title && (
                  <span className="inline-block text-sm font-bold px-3 py-1 bg-bark-800 text-bark-300 rounded-full mt-1">
                    {user.title}
                  </span>
                )}
              </div>

              <RankBadge league={user.league} rp={user.rp} showRP size="lg" />

              <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm text-bone-400">
                <span>📅 Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
                <span>🏆 {user.wins + user.losses} matchs joués</span>
              </div>
            </div>

            {isMe && (
              <button className="glass-card px-4 py-2 text-sm font-semibold text-bone-300 hover:text-white hover:border-bone-600/40 transition-all">
                ✏️ Modifier
              </button>
            )}
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}22` }}
              >
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs text-bone-500 font-semibold">{s.label}</p>
                <p className="font-display text-xl text-white">{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Badges */}
        {user.badges.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6 space-y-4">
            <h2 className="font-display text-2xl text-white">BADGES ({user.badges.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {user.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="glass-card p-3 text-center hover:scale-105 transition-transform"
                  style={{ borderColor: `${rarityColors[badge.rarity]}44` }}
                  title={badge.description}
                >
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <p className="font-bold text-white text-xs truncate">{badge.name}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: rarityColors[badge.rarity] }}>
                    {badge.rarity}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Match history */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6 space-y-4">
          <h2 className="font-display text-2xl text-white">HISTORIQUE DES MATCHS</h2>

          {matches.length === 0 ? (
            <div className="text-center py-8 text-bone-500">
              <p className="text-3xl mb-2">🐾</p>
              <p>Aucun match dans l'historique.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((match) => {
                const isWinner = match.winnerId === user.id;
                const isDraw = !match.winnerId;
                const opponent = match.player1Id === user.id ? match.player2 : match.player1;
                const myScore = match.player1Id === user.id ? match.player1Score : match.player2Score;
                const oppScore = match.player1Id === user.id ? match.player2Score : match.player1Score;
                const rpChange = match.player1Id === user.id ? match.player1RpChange : match.player2RpChange;

                return (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 rounded-xl p-3 bg-bone-800/40 hover:bg-bone-800/60 transition-colors"
                  >
                    <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isDraw ? "bg-yellow-500" : isWinner ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="w-16 text-center">
                      <p className={`font-bold text-xs ${isDraw ? "text-yellow-400" : isWinner ? "text-green-400" : "text-red-400"}`}>
                        {isDraw ? "ÉGAL" : isWinner ? "VICTOIRE" : "DÉFAITE"}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        vs {opponent?.username ?? "Inconnu"}
                      </p>
                      <p className="text-xs text-bone-500">
                        {new Date(match.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-bone-400">{Math.round(myScore)} pts</p>
                      <p className="text-xs text-bone-600">vs {Math.round(oppScore)} pts</p>
                    </div>
                    <div className={`font-bold text-sm w-20 text-right ${getRPColor(rpChange)}`}>
                      {formatRPChange(rpChange)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
