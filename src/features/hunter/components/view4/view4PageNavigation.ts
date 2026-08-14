import { createContext, useContext, type ReactNode } from "react";

export interface View4PageSpec {
  id: string;
  title: string;
  eyebrow?: string;
  content: ReactNode;
}

export interface View4PageNavigation {
  pushPage: (page: View4PageSpec) => void;
  popPage: () => void;
  returnToRoot: () => void;
}

export const View4PageNavigationContext = createContext<View4PageNavigation | null>(null);

export function useView4PageNavigation() {
  const value = useContext(View4PageNavigationContext);
  if (!value) throw new Error("View 4 page navigation must be inside its page stack");
  return value;
}

export function useOptionalView4PageNavigation() {
  return useContext(View4PageNavigationContext);
}
