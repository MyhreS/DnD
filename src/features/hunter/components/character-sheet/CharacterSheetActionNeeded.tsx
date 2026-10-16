/** The unmissable "you have something to do" banner for an unfinished level
 * upgrade: what is needed, in words, and one button that goes there. */
export function CharacterSheetActionNeeded({ newLevel, missing, onAct }: {
  newLevel: number | null;
  missing: string[];
  onAct: () => void;
}) {
  if (newLevel == null && missing.length === 0) return null;
  const title = newLevel != null ? `Level ${newLevel} is ready` : `Finish your level: ${missing.join(" and ")}`;
  const detail = newLevel != null
    ? `You have earned a new level. Open the upgrade to see what you gain${missing.length ? ` and choose ${missing.join(" and ")}` : ""}, then save.`
    : `Your current level still needs ${missing.length === 1 ? "this choice" : "these choices"} before it is complete.`;
  return <section className="character-sheet-action-needed" role="alert" aria-live="polite">
    <span className="character-sheet-action-icon" aria-hidden="true">!</span>
    <div><small>Action needed</small><strong>{title}</strong><p>{detail}</p></div>
    <button data-haptic="light" type="button" onClick={onAct}>{newLevel != null ? "Upgrade now" : "Choose now"} <span aria-hidden="true">→</span></button>
  </section>;
}
