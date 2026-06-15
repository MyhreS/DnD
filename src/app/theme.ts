import { create } from "zustand";

export type Theme = "dark" | "light";
const KEY = "cs-theme";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function read(): Theme {
  const stored = localStorage.getItem(KEY);
  return stored === "light" ? "light" : "dark";
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: read(),
  setTheme: (theme) => {
    apply(theme);
    localStorage.setItem(KEY, theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));

// Apply immediately on load (the inline script in index.html also does this to
// avoid a flash; this keeps the store and the DOM in sync).
apply(useTheme.getState().theme);
