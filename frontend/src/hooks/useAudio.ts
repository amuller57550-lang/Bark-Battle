"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AudioMetrics {
  volume: number;
  peak: number;
  isSpeaking: boolean;
  frequencyData: Uint8Array | null;
}

export function useAudio() {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics>({
    volume: 0,
    peak: 0,
    isSpeaking: false,
    frequencyData: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const peakRef = useRef(0);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null!);

  const analyze = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // RMS volume calculation
      const sum = dataArray.reduce((acc, val) => acc + val * val, 0);
      const rms = Math.sqrt(sum / bufferLength);
      const volume = Math.min(100, (rms / 128) * 100);

      if (volume > peakRef.current) peakRef.current = volume;

      const isSpeaking = volume > 8;
      if (isSpeaking) {
        clearTimeout(silenceTimeoutRef.current);
      }

      setMetrics({
        volume: Math.round(volume),
        peak: Math.round(peakRef.current),
        isSpeaking,
        frequencyData: new Uint8Array(dataArray),
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      });

      streamRef.current = stream;
      const context = new AudioContext();
      contextRef.current = context;

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsActive(true);
      setError(null);
      peakRef.current = 0;
      analyze();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setError(msg);
    }
  }, [analyze]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    analyserRef.current = null;
    peakRef.current = 0;
    setIsActive(false);
    setMetrics({ volume: 0, peak: 0, isSpeaking: false, frequencyData: null });
  }, []);

  const resetPeak = useCallback(() => {
    peakRef.current = 0;
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      contextRef.current?.close();
    };
  }, []);

  return { isActive, error, metrics, start, stop, resetPeak, getStream };
}
