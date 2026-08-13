import { useEffect } from "react";

const ROOT_CLASS = "v4-drawer-safe-area";

/** Match browser/native safe-area chrome to the open View 4 drawer surface. */
export function useView4DrawerSafeArea(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeColor?.content;
    root.classList.add(ROOT_CLASS);
    const drawerColor = getComputedStyle(root).getPropertyValue("--v4-drawer-safe-area").trim();
    if (themeColor && drawerColor) themeColor.content = drawerColor;
    return () => {
      root.classList.remove(ROOT_CLASS);
      if (themeColor && previousThemeColor !== undefined) themeColor.content = previousThemeColor;
    };
  }, [active]);
}
