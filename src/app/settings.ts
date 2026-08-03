import { create } from "zustand";

// Local, per-device UI preferences (not synced to Firestore). Mirrors the
// pattern in app/theme.ts.
const DM_KEY = "cs-dm";

function readDmMode(): boolean {
  // Default off (player); only an explicit "on" marks this device as a DM's.
  return localStorage.getItem(DM_KEY) === "on";
}

interface SettingsState {
  /** Dungeon Master mode: unlocks the DM overview page (every hunter's
   * character sheet, read-only). Off by default — players never see it.
   * (The board's PICKS live on the /users doc — see features/dm/useDmPicks.) */
  dmMode: boolean;
  setDmMode: (on: boolean) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  dmMode: readDmMode(),
  setDmMode: (on) => {
    localStorage.setItem(DM_KEY, on ? "on" : "off");
    set({ dmMode: on });
  },
}));
