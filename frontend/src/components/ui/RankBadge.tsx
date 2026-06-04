"use client";

import { League, LEAGUE_CONFIG } from "@/types";
import { cn } from "@/lib/utils";

interface RankBadgeProps {
  league: League;
  rp?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  showRP?: boolean;
  className?: string;
}

const sizes = {
  sm: { emoji: "text-lg", text: "text-xs", badge: "px-2 py-0.5 gap-1" },
  md: { emoji: "text-2xl", text: "text-sm", badge: "px-3 py-1 gap-1.5" },
  lg: { emoji: "text-3xl", text: "text-base", badge: "px-4 py-1.5 gap-2" },
  xl: { emoji: "text-5xl", text: "text-xl", badge: "px-5 py-2 gap-3" },
};

export function RankBadge({ league, rp, size = "md", showName = true, showRP = false, className }: RankBadgeProps) {
  const config = LEAGUE_CONFIG[league];
  const s = sizes[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl font-bold league-shine",
        s.badge,
        className
      )}
      style={{
        background: `${config.color}22`,
        border: `1px solid ${config.color}55`,
        color: config.color,
      }}
    >
      <span className={s.emoji}>{config.emoji}</span>
      {showName && (
        <span className={cn(s.text, "font-display tracking-wide")}>{config.name}</span>
      )}
      {showRP && rp !== undefined && (
        <span className={cn(s.text, "opacity-75")}>{rp} RP</span>
      )}
    </div>
  );
}
