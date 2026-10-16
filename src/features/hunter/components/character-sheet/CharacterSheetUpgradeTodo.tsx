import { useHapticOnComplete } from "../../hooks/useHapticOnComplete";

export type UpgradeTodo = { label: string; done: boolean };

/** What this upgrade step needs from the player, impossible to miss: each
 * required action with a tick once done. */
export function CharacterSheetUpgradeTodo({ items }: { items: UpgradeTodo[] }) {
  const complete = items.length > 0 && items.every((item) => item.done);
  useHapticOnComplete(complete);
  if (items.length === 0) return null;
  return <section className={`character-sheet-upgrade-todo${complete ? " is-complete" : ""}`} aria-label="To do on this step" role="status">
    <header><span aria-hidden="true">{complete ? "✓" : "!"}</span><b>{complete ? "Done — press Next" : "To do on this step"}</b></header>
    <ul>{items.map((item) => <li key={item.label} className={item.done ? "is-done" : ""}><i aria-hidden="true">{item.done ? "✓" : ""}</i>{item.label}</li>)}</ul>
  </section>;
}
