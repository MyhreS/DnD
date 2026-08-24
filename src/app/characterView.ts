import { create } from "zustand";

export type CharacterView = "quick" | "hud";

const KEY = "cs-character-sheet-view";

function read(): CharacterView {
  return window.localStorage.getItem(KEY) === "quick" ? "quick" : "hud";
}

interface CharacterViewState {
  view: CharacterView;
  setView: (view: CharacterView) => void;
}

export const useCharacterView = create<CharacterViewState>((set) => ({
  view: read(),
  setView: (view) => {
    window.localStorage.setItem(KEY, view);
    set({ view });
  },
}));
