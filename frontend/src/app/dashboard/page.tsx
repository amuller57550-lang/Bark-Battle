"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Swords, Trophy, TrendingUp, Clock, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Navbar } from "@/components/layout/Navbar";
import { RankBadge } from "@/components/ui/RankBadge";
import { matchesAPI } from "@/lib/api";
import { Match } from "@/types";
import { formatRPChange, getRPColor, getLeagueConfig } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, color = "#f97316" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold text-bone-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-bone-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    matchesAPI.getHistory(1, 5)
      .then(({ data }) => setRecentMatches(data.matches || []))
      .catch(() => {});
  }, [user, router]);

  if (!user) return null;

  const leagueConfig = getLeagueConfig(user.league);
  const leagueProgress = user.rp - leagueConfig.minRP;
  const leagueRange = leagueConfig.maxRP - leagueConfig.minRP;
  const progressPct = Math.min(100, (leagueProgress / leagueRange) * 100);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 page-enter">
        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6"
          style={{ borderColor: `${leagueConfig.color}44` }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 league-shine"
            style={{ background: `${leagueConfig.color}22`, border: `2px solid ${leagueConfig.color}66` }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              leagueConfig.emoji
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl text-white">{user.username}</h1>
              {user.title && (
                <span className="text-xs font-bold px-3 py-1 bg-bark-800 text-bark-300 rounded-full">
                  {user.title}
                </span>
              )}
            </div>
            <RankBadge league={user.league} rp={user.rp} showRP />

            {/* League progress bar */}
            <div className="space-y-1 max-w-sm">
              <div className="flex justify-between text-xs text-bone-500">
                <span>{user.rp} RP</span>
                <span>{leagueConfig.maxRP < 99999 ? `${leagueConfig.maxRP} RP` : "Max"}</span>
              </div>
              <div className="h-2 bg-bone-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: leagueConfig.color }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <Link
              href="/matchmaking"
              className="bg-bark-600 hover:bg-bark-500 text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-95 text-center flex items-center gap-2 justify-center"
            >
              <Swords size={18} />
              JOUER
            </Link>
            <Link
              href={`/profile/${user.id}`}
              className="bg-bone-700 hover:bg-bone-600 text-white font-semibold py-3 px-8 rounded-xl transition-all text-center"
            >
              Mon Profil
            </Link>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatCard icon={Trophy} label="Victoires" value={user.wins} sub={`${Math.round(user.winRate ?? 0)}% win rate`} color="#fbbf24" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <StatCard icon={TrendingUp} label="Série actuelle" value={`${user.currentStreak}🔥`} sub={`Record: ${user.winStreak}`} color="#f97316" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatCard icon={Zap} label="Pic sonore" value={`${user.biggestBark}%`} sub="Meilleur aboiement" color="#a855f7" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <StatCard icon={Clock} label="Matchs joués" value={user.wins + user.losses} sub="Total carrière" color="#22c55e" />
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick play modes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 space-y-4"
          >
            <h2 className="font-display text-2xl text-white">JOUER</h2>

            <Link href="/matchmaking?mode=ranked" className="flex items-center gap-4 bg-bark-900/50 hover:bg-bark-900 border border-bark-700/30 hover:border-bark-600/50 rounded-xl p-4 transition-all group">
              <span className="text-3xl">⚔️</span>
              <div className="flex-1">
                <p className="font-bold text-white">Partie Classée</p>
                <p className="text-sm text-bone-400">Matchmaking automatique · Gain de RP</p>
              </div>
              <span className="text-bark-500 group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <Link href="/matchmaking?mode=private" className="flex items-center gap-4 bg-bone-800/50 hover:bg-bone-800 border border-bone-700/30 hover:border-bone-600/50 rounded-xl p-4 transition-all group">
              <span className="text-3xl">🏠</span>
              <div className="flex-1">
                <p className="font-bold text-white">Salon Privé</p>
                <p className="text-sm text-bone-400">Invite un ami avec un code</p>
              </div>
              <span className="text-bone-500 group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <Link href="/matchmaking?mode=bot" className="flex items-center gap-4 bg-bone-800/50 hover:bg-bone-800 border border-bone-700/30 hover:border-bone-600/50 rounded-xl p-4 transition-all group">
              <span className="text-3xl">🤖</span>
              <div className="flex-1">
                <p className="font-bold text-white">Contre le Robot</p>
                <p className="text-sm text-bone-400">Entraîne-toi contre l'IA</p>
              </div>
              <span className="text-bone-500 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </motion.div>

          {/* Recent matches */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-white">MATCHS RÉCENTS</h2>
              <Link href={`/profile/${user.id}`} className="text-sm text-bark-400 hover:text-bark-300 font-semibold">
                Voir tout →
              </Link>
            </div>

            {recentMatches.length === 0 ? (
              <div className="text-center py-8 text-bone-500">
                <p className="text-4xl mb-2">🐾</p>
                <p>Aucun match joué encore.</p>
                <Link href="/matchmaking" className="text-bark-400 text-sm font-semibold hover:text-bark-300">
                  Joue ton premier match !
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMatches.map((match) => {
                  const isWinner = match.winnerId === user.id;
                  const opponent = match.player1Id === user.id ? match.player2 : match.player1;
                  const myScore = match.player1Id === user.id ? match.player1Score : match.player2Score;
                  const oppScore = match.player1Id === user.id ? match.player2Score : match.player1Score;
                  const rpChange = match.player1Id === user.id ? match.player1RpChange : match.player2RpChange;

                  return (
                    <div key={match.id} className="flex items-center gap-3 bg-bone-800/50 rounded-xl p-3">
                      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isWinner ? "bg-green-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">vs {opponent?.username ?? "Inconnu"}</p>
                        <p className="text-xs text-bone-500">{myScore.toFixed(0)} vs {oppScore.toFixed(0)} pts</p>
                      </div>
                      <span className={`font-bold text-sm ${getRPColor(rpChange)}`}>
                        {formatRPChange(rpChange)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Badges */}
        {(user.badges ?? []).length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl text-white">MES BADGES</h2>
              <Link href={`/profile/${user.id}`} className="text-sm text-bark-400 hover:text-bark-300 font-semibold">Voir tout →</Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {(user.badges ?? []).slice(0, 8).map((badge) => (
                <div key={badge.id} className="flex items-center gap-2 glass-card px-3 py-2 hover:border-bark-500/30 transition-all" title={badge.description}>
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-sm font-semibold text-bone-300">{badge.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
