import { useEffect } from "react";
import type { AppEditStageValue } from "../components/appsheet/appEditStageContext";

/** Character sheet edits save the moment they're made — no review step. The
 * level-up and new-Hunter flows still gather several choices first and save
 * them together, so a staged level (an upgrade in progress) waits for them. */
export function useAutoApplyStage(stage: AppEditStageValue, enabled: boolean) {
  const { hasChanges, patch, apply } = stage;
  useEffect(() => {
    if (enabled && hasChanges && patch.level === undefined) apply();
  }, [enabled, hasChanges, patch, apply]);
}
