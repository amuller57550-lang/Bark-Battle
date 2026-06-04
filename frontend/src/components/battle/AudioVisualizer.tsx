"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  frequencyData: Uint8Array | null;
  volume: number;
  color?: string;
  className?: string;
  barCount?: number;
}

export function AudioVisualizer({
  frequencyData,
  volume,
  color = "#f97316",
  className,
  barCount = 32,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const data = frequencyData
      ? Array.from(frequencyData).slice(0, barCount)
      : Array.from({ length: barCount }, (_, i) =>
          volume > 5 ? Math.random() * volume * 1.2 : 5
        );

    const barW = W / barCount;
    const gap = 2;

    data.forEach((value, i) => {
      const normalised = value / 255;
      const barH = Math.max(4, normalised * H * 0.9);
      const x = i * barW + gap / 2;

      // Gradient per bar
      const grad = ctx.createLinearGradient(x, H - barH, x, H);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color + "cc");
      grad.addColorStop(1, color + "44");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, H - barH, barW - gap, barH, [2]);
      ctx.fill();
    });
  }, [frequencyData, volume, color, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 8}
      height={64}
      className={cn("w-full", className)}
    />
  );
}
