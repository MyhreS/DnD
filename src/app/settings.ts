import { create } from "zustand";

// Local, per-device UI preferences (not synced to Firestore). Mirrors the
// pattern in app/theme.ts.
const FIGHTERS_KEY = "cs-fighters";

function readFighters(): boolean {
  // Default on; only an explicit "off" disables them.
  return localStorage.getItem(FIGHTERS_KEY) !== "off";
}

interface SettingsState {
  /** Whether the occasional 3D fighter shows are allowed to play. */
  fighters: boolean;
  setFighters: (on: boolean) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  fighters: readFighters(),
  setFighters: (on) => {
    localStorage.setItem(FIGHTERS_KEY, on ? "on" : "off");
    set({ fighters: on });
  },
}));
