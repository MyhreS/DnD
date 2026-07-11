import { create } from "zustand";

// Local, per-device UI preferences (not synced to Firestore). Mirrors the
// pattern in app/theme.ts.
const FIGHTERS_KEY = "cs-fighters";
const EXPERIMENTAL_KEY = "cs-experimental";
const DM_KEY = "cs-dm";
const DM_PICKS_KEY = "cs-dm-picks";

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

function readDmPicks(): string[] {
  // A JSON array of character ids; anything malformed reads as "no picks".
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DM_PICKS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeDmPicks(ids: string[]) {
  localStorage.setItem(DM_PICKS_KEY, JSON.stringify(ids));
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
   * character sheet, read-only). Off by default — players never see it. */
  dmMode: boolean;
  setDmMode: (on: boolean) => void;
  /** Character ids the DM has summoned to their board (/dm). Per-device, like
   * every setting here; syncing via the /users doc is a possible future upgrade. */
  dmPicks: string[];
  addDmPick: (id: string) => void;
  removeDmPick: (id: string) => void;
  /** Replace the picks wholesale — used to prune ids whose character is gone. */
  setDmPicks: (ids: string[]) => void;
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
  dmPicks: readDmPicks(),
  addDmPick: (id) =>
    set((s) => {
      if (s.dmPicks.includes(id)) return s;
      const next = [...s.dmPicks, id];
      writeDmPicks(next);
      return { dmPicks: next };
    }),
  removeDmPick: (id) =>
    set((s) => {
      const next = s.dmPicks.filter((x) => x !== id);
      writeDmPicks(next);
      return { dmPicks: next };
    }),
  setDmPicks: (ids) => {
    writeDmPicks(ids);
    set({ dmPicks: ids });
  },
}));
