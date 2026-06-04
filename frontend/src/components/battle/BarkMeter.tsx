"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BarkMeterProps {
  volume: number;
  peak: number;
  label?: string;
  side?: "left" | "right";
  className?: string;
}

function getVolumeLabel(v: number): string {
  if (v >= 90) return "🔥 FRACASSANT !";
  if (v >= 75) return "💥 PUISSANT !";
  if (v >= 60) return "⚡ FORT !";
  if (v >= 40) return "🔊 CORRECT";
  if (v >= 20) return "🔉 FAIBLE";
  return "🔇 Silence...";
}

function getVolumeColor(v: number): string {
  if (v >= 80) return "#ef4444";
  if (v >= 60) return "#f97316";
  if (v >= 40) return "#fbbf24";
  return "#22c55e";
}

export function BarkMeter({ volume, peak, label, side = "left", className }: BarkMeterProps) {
  const color = getVolumeColor(volume);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className={cn("flex items-center gap-2", side === "right" && "flex-row-reverse")}>
          <span className="text-sm font-bold text-bone-300">{label}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-bone-800 text-bone-400">
            {getVolumeLabel(volume)}
          </span>
        </div>
      )}

      {/* Main meter */}
      <div className="relative h-8 bg-bone-800 rounded-full overflow-hidden border border-bone-700">
        {/* Peak indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-white/40 transition-all duration-300"
          style={{ left: `${peak}%` }}
        />

        {/* Volume fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bark-meter-fill"
          animate={{ width: `${volume}%` }}
          transition={{ duration: 0.08 }}
          style={{
            background: `linear-gradient(90deg, ${color}66 0%, ${color} 60%, #fff 100%)`,
            boxShadow: volume > 10 ? `0 0 12px ${color}88` : "none",
          }}
        />

        {/* Volume label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black text-white drop-shadow mix-blend-luminosity">
            {Math.round(volume)}%
          </span>
        </div>
      </div>

      {/* Mini bars visualizer */}
      <div className={cn("flex gap-0.5 items-end h-6", side === "right" && "flex-row-reverse")}>
        {Array.from({ length: 20 }).map((_, i) => {
          const threshold = (i / 20) * 100;
          const active = volume > threshold;
          const barH = 4 + (i / 20) * 20;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-75"
              style={{
                height: `${active ? barH : 4}px`,
                background: active
                  ? `hsl(${30 - i * 1.5}, 95%, ${55 + i * 1}%)`
                  : "#44403c",
                opacity: active ? 1 : 0.3,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
