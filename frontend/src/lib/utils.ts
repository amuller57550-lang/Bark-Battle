import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { League, LEAGUE_CONFIG } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLeagueFromRP(rp: number): League {
  if (rp >= 5000) return "DOG_KING";
  if (rp >= 4000) return "DIAMOND_ALPHA";
  if (rp >= 3000) return "PLATINUM_JAW";
  if (rp >= 2000) return "GOLD_KIBBLE";
  if (rp >= 1000) return "SILVER_KENNEL";
  return "BRONZE_BONE";
}

export function getLeagueConfig(league: League) {
  return LEAGUE_CONFIG[league];
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function volumeToDecibels(volume: number): number {
  if (volume === 0) return -Infinity;
  return 20 * Math.log10(volume / 100);
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function getRPColor(rpChange: number): string {
  if (rpChange > 0) return "text-green-400";
  if (rpChange < 0) return "text-red-400";
  return "text-gray-400";
}

export function formatRPChange(rpChange: number): string {
  if (rpChange > 0) return `+${rpChange} RP`;
  return `${rpChange} RP`;
}
