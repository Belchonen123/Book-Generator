import { create } from "zustand";

/**
 * Top-of-page progress bar: ref-count in-flight work (API / streaming) plus optional route pulse.
 */
type GlobalProgressState = {
  inFlight: number;
  start: () => void;
  stop: () => void;
};

export const useGlobalProgressStore = create<GlobalProgressState>((set, get) => ({
  inFlight: 0,
  start: () => set({ inFlight: get().inFlight + 1 }),
  stop: () => set({ inFlight: Math.max(0, get().inFlight - 1) }),
}));
