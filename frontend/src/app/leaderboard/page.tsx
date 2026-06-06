"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Calendar, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { RankBadge } from "@/components/ui/RankBadge";
import { leaderboardAPI } from "@/lib/api";
import { LeaderboardEntry, League, LEAGUE_CONFIG } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { formatWinRate } from "@/lib/utils";

type Tab = "global" | "weekly" | "monthly";

const MOCK_ENTRIES: LeaderboardEntry[] = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  userId: `user-${i}`,
  username: ["AlphaDog", "BergerFou", "ChienNoir", "LoupSilver", "Cerbère42"][i % 5] + `_${i + 1}`,
  league: (["DOG_KING", "DIAMOND_ALPHA", "PLATINUM_JAW", "GOLD_KIBBLE", "SILVER_KENNEL"] as League[])[Math.min(i, 4)],
  rp: Math.max(100, 5500 - i * 220),
  wins: Math.max(10, 350 - i * 15),
  losses: Math.max(5, 80 + i * 7),
  winRate: Math.max(40, 85 - i * 2),
  winStreak: Math.max(0, 15 - i),
}));

function RankNumber({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="font-display text-lg text-bone-400 w-8 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const req = tab === "global"
      ? leaderboardAPI.getGlobal()
      : tab === "weekly"
      ? leaderboardAPI.getWeekly()
      : leaderboardAPI.getMonthly();

    req
      .then(({ data }) => setEntries(data.entries || MOCK_ENTRIES))
      .catch(() => setEntries(MOCK_ENTRIES))
      .finally(() => setLoading(false));
  }, [tab]);

  const tabs = [
    { id: "global" as Tab, label: "Mondial", icon: Trophy },
    { id: "weekly" as Tab, label: "Hebdo", icon: TrendingUp },
    { id: "monthly" as Tab, label: "Mensuel", icon: Calendar },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6 page-enter">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-5xl text-white">🏆 CLASSEMENT</h1>
          <p className="text-bone-400">Les meilleurs aboyeurs du monde</p>
        </div>

        {/* League overview */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {(Object.entries(LEAGUE_CONFIG) as [League, typeof LEAGUE_CONFIG[League]][]).reverse().map(([league, cfg]) => (
            <div
              key={league}
              className="glass-card p-3 text-center"
              style={{ borderColor: `${cfg.color}33` }}
            >
              <div className="text-2xl">{cfg.emoji}</div>
              <p className="text-xs font-bold mt-1 truncate" style={{ color: cfg.color }}>{cfg.name.split(" ")[0]}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 glass-card p-1 rounded-xl">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                tab === id ? "bg-bark-600 text-white" : "text-bone-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {/* Head */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-bone-800 text-xs font-semibold text-bone-500 uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Joueur</div>
            <div className="col-span-3">Ligue</div>
            <div className="col-span-2 text-right">V/D</div>
            <div className="col-span-2 text-right">Win%</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="text-4xl">🐾</motion.div>
            </div>
          ) : (
            <div>
              {entries.map((entry, i) => {
                const isMe = entry.userId === user?.id;
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 border-b border-bone-800/50 hover:bg-bone-800/30 transition-colors ${
                      isMe ? "bg-bark-900/30 border-bark-700/20" : ""
                    }`}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      <RankNumber rank={entry.rank} />
                    </div>

                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: `${LEAGUE_CONFIG[entry.league].color}22` }}
                      >
                        {LEAGUE_CONFIG[entry.league].emoji}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isMe ? "text-bark-300" : "text-white"}`}>
                          {entry.username}
                          {isMe && <span className="text-xs text-bark-500 ml-1">(vous)</span>}
                        </p>
                        {entry.winStreak > 3 && (
                          <p className="text-xs text-orange-400">🔥 {entry.winStreak} victoires</p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-3">
                      <RankBadge league={entry.league} rp={entry.rp} size="sm" showRP />
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="text-green-400 text-sm font-semibold">{entry.wins}</span>
                      <span className="text-bone-600 mx-1">/</span>
                      <span className="text-red-400 text-sm font-semibold">{entry.losses}</span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="font-bold text-sm text-white">{formatWinRate(entry.wins, entry.losses)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* My rank if not in top 100 */}
        {user && !entries.find((e) => e.userId === user.id) && (
          <div className="glass-card p-4 border-bark-700/30 flex items-center gap-4">
            <span className="text-2xl">📍</span>
            <div className="flex-1">
              <p className="font-bold text-white">Ton classement actuel</p>
              <p className="text-sm text-bone-400">{user.rp} RP · {user.wins}V / {user.losses}D</p>
            </div>
            <RankBadge league={user.league} size="sm" />
          </div>
        )}
      </main>
    </div>
  );
}
