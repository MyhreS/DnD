import { create } from "zustand";

// Local, per-device UI preferences (not synced to Firestore). Mirrors the
// pattern in app/theme.ts.
const FIGHTERS_KEY = "cs-fighters";
const EXPERIMENTAL_KEY = "cs-experimental";
const DM_KEY = "cs-dm";

function readFighters(): boolean {
  // Default on; only an explicit "off" disables them.
  return localStorage.getItem(FIGHTERS_KEY) !== "off";
}

function readExperimental(): boolean {
  // Default off; only an explicit "on" enables the untested features.
  return localStorage.getItem(EXPERIMENTAL_KEY) === "on";
}

function readDmMode(): boolean {
  // Default off (player); only an explicit "on" marks this device as a DM's.
  return localStorage.getItem(DM_KEY) === "on";
}

interface SettingsState {
  /** Whether the occasional 3D fighter shows are allowed to play. */
  fighters: boolean;
  setFighters: (on: boolean) => void;
  /** Experimental features: campaigns, sessions & live play (still in testing).
   * Off by default — the whole campaign surface is hidden until enabled. */
  experimental: boolean;
  setExperimental: (on: boolean) => void;
  /** Dungeon Master mode: unlocks the DM overview page (every hunter's
   * character sheet, read-only). Off by default — players never see it.
   * (The board's PICKS live on the /users doc — see features/dm/useDmPicks.) */
  dmMode: boolean;
  setDmMode: (on: boolean) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  fighters: readFighters(),
  setFighters: (on) => {
    localStorage.setItem(FIGHTERS_KEY, on ? "on" : "off");
    set({ fighters: on });
  },
  experimental: readExperimental(),
  setExperimental: (on) => {
    localStorage.setItem(EXPERIMENTAL_KEY, on ? "on" : "off");
    set({ experimental: on });
  },
  dmMode: readDmMode(),
  setDmMode: (on) => {
    localStorage.setItem(DM_KEY, on ? "on" : "off");
    set({ dmMode: on });
  },
}));
