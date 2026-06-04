import { create } from "zustand";
import { BattleState, BonusEvent } from "@/types";

interface BattleStore {
  battle: BattleState | null;
  localVolume: number;
  localPeak: number;
  localAvg: number;
  isMicActive: boolean;
  isMuted: boolean;
  setBattle: (battle: BattleState | null) => void;
  updateBattle: (patch: Partial<BattleState>) => void;
  setLocalVolume: (v: number) => void;
  setLocalPeak: (v: number) => void;
  setLocalAvg: (v: number) => void;
  setMicActive: (active: boolean) => void;
  setMuted: (muted: boolean) => void;
  addBonus: (bonus: BonusEvent) => void;
  reset: () => void;
}

export const useBattleStore = create<BattleStore>((set) => ({
  battle: null,
  localVolume: 0,
  localPeak: 0,
  localAvg: 0,
  isMicActive: false,
  isMuted: false,

  setBattle: (battle) => set({ battle }),
  updateBattle: (patch) =>
    set((state) => ({
      battle: state.battle ? { ...state.battle, ...patch } : null,
    })),
  setLocalVolume: (localVolume) => set({ localVolume }),
  setLocalPeak: (localPeak) => set({ localPeak }),
  setLocalAvg: (localAvg) => set({ localAvg }),
  setMicActive: (isMicActive) => set({ isMicActive }),
  setMuted: (isMuted) => set({ isMuted }),
  addBonus: (bonus) =>
    set((state) => ({
      battle: state.battle
        ? { ...state.battle, bonuses: [...state.battle.bonuses, bonus] }
        : null,
    })),
  reset: () =>
    set({
      battle: null,
      localVolume: 0,
      localPeak: 0,
      localAvg: 0,
      isMicActive: false,
    }),
}));
