/** The unmissable "you have something to do" banner for an unfinished level
 * upgrade: what is needed, in words, and one button that goes there. */
export function CharacterSheetActionNeeded({ newLevel, currentLevel, missing, onAct, onDismiss }: {
  newLevel: number | null;
  /** The saved level, so a jump of several levels can say so. */
  currentLevel: number;
  missing: string[];
  onAct: () => void;
  /** Lets the player put the banner away for now (the front page only). */
  onDismiss?: () => void;
}) {
  if (newLevel == null && missing.length === 0) return null;
  const gained = newLevel != null ? newLevel - currentLevel : 0;
  const title = newLevel == null ? `Finish your level: ${missing.join(" and ")}`
    : gained > 1 ? `${gained} levels are ready: ${currentLevel} → ${newLevel}` : `Level ${newLevel} is ready`;
  const detail = newLevel != null
    ? gained > 1
      ? `You have earned ${gained} new levels. One upgrade takes you all the way to level ${newLevel}: it walks through each level's gains and choices${missing.length ? `, including ${missing.join(" and ")}` : ""}, then you save once.`
      : `You have earned a new level. Open the upgrade to see what you gain${missing.length ? ` and choose ${missing.join(" and ")}` : ""}, then save.`
    : `Your current level still needs ${missing.length === 1 ? "this choice" : "these choices"} before it is complete.`;
  return <section className="character-sheet-action-needed" role="alert" aria-live="polite">
    <span className="character-sheet-action-icon" aria-hidden="true">!</span>
    <div><small>Action needed</small><strong>{title}</strong><p>{detail}</p></div>
    <button data-haptic="light" type="button" onClick={onAct}>{newLevel != null ? "Upgrade now" : "Choose now"} <span aria-hidden="true">→</span></button>
    {onDismiss && <button type="button" className="character-sheet-action-dismiss" aria-label="Hide for now — level up later from Insight & Level" onClick={onDismiss}>×</button>}
  </section>;
}
