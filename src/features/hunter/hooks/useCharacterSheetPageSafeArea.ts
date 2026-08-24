import { useEffect } from "react";

const ROOT_CLASS = "character-sheet-page-safe-area";

/** Match browser/native safe-area chrome to the open Character sheet page surface. */
export function useCharacterSheetPageSafeArea(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeColor?.content;
    root.classList.add(ROOT_CLASS);
    const pageColor = getComputedStyle(root).getPropertyValue("--character-sheet-page-safe-area").trim();
    if (themeColor && pageColor) themeColor.content = pageColor;
    return () => {
      root.classList.remove(ROOT_CLASS);
      if (themeColor && previousThemeColor !== undefined) themeColor.content = previousThemeColor;
    };
  }, [active]);
}
