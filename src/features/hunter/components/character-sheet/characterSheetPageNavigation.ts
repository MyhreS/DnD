import { createContext, useContext, type ReactNode } from "react";

export interface CharacterSheetPageSpec {
  id: string;
  title: string;
  eyebrow?: string;
  content: ReactNode;
}

export interface CharacterSheetPageNavigation {
  pushPage: (page: CharacterSheetPageSpec) => void;
  popPage: () => void;
  returnToRoot: () => void;
}

export const CharacterSheetPageNavigationContext = createContext<CharacterSheetPageNavigation | null>(null);

export function useCharacterSheetPageNavigation() {
  const value = useContext(CharacterSheetPageNavigationContext);
  if (!value) throw new Error("Character sheet page navigation must be inside its page stack");
  return value;
}
