import type { ReactNode } from "react";
import { useAppEditStageValue } from "../../hooks/useAppEditStageValue";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStageContext } from "./appEditStageContext";

export function AppEditStage({ model, children, onPendingChange }: { model: AppSheetModel; children: ReactNode; onPendingChange?: (pending: boolean) => void }) {
  const value = useAppEditStageValue(model, onPendingChange);
  return <AppEditStageContext.Provider value={value}>{children}</AppEditStageContext.Provider>;
}
