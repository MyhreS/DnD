import { useState, type FormEvent } from "react";
import type { EnemyStats, EnemyTemplate } from "@/types";

export function EnemyEditorDialog({
  template,
  busy,
  canAddToBattle,
  onSave,
  onClose,
}: {
  template: EnemyTemplate | null;
  busy: boolean;
  canAddToBattle: boolean;
  onSave: (stats: EnemyStats, addToBattle: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [maxHp, setMaxHp] = useState(String(template?.maxHp ?? 10));
  const [initiative, setInitiative] = useState(String(template?.initiative ?? 10));
  const [ac, setAc] = useState(template?.ac == null ? "" : String(template.ac));
  const [note, setNote] = useState(template?.note ?? "");
  const [hideHp, setHideHp] = useState(template?.revealHp !== true);
  const [revealStats, setRevealStats] = useState(template?.revealStats ?? false);
  const [addToBattle, setAddToBattle] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim().slice(0, 80);
    if (!cleanName) return;
    await onSave({
      name: cleanName,
      maxHp: Math.min(9999, Math.max(1, Number.parseInt(maxHp, 10) || 1)),
      initiative: Math.min(99, Math.max(-99, Number.parseInt(initiative, 10) || 0)),
      ac: ac.trim() ? Math.min(99, Math.max(0, Number.parseInt(ac, 10) || 0)) : null,
      note: note.trim().slice(0, 240) || null,
      revealHp: !hideHp,
      revealStats,
    }, addToBattle);
  }

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="game-dialog" role="dialog" aria-modal="true" aria-labelledby="enemy-editor-title" onSubmit={submit}>
        <header><div><p className="eyebrow">Enemy library</p><h2 id="enemy-editor-title">{template ? "Edit enemy" : "New enemy"}</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <p className="muted">Saved enemies can be reused in future battles.</p>
        <div className="game-dialog-grid">
          <label className="game-field game-dialog-wide"><span>Name</span><input className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label className="game-field"><span>Max HP</span><input className="input" type="number" min="1" max="9999" value={maxHp} onChange={(event) => setMaxHp(event.target.value)} /></label>
          <label className="game-field"><span>Initiative</span><input className="input" type="number" min="-99" max="99" value={initiative} onChange={(event) => setInitiative(event.target.value)} /></label>
          <label className="game-field"><span>AC</span><input className="input" type="number" min="0" max="99" value={ac} onChange={(event) => setAc(event.target.value)} placeholder="—" /></label>
          <label className="game-field game-dialog-wide"><span>Private notes</span><input className="input" value={note} maxLength={240} onChange={(event) => setNote(event.target.value)} placeholder="Attacks, damage, or reminders" /></label>
        </div>
        <fieldset className="game-visibility-options">
          <legend>Player visibility</legend>
          <label className="game-check"><input type="checkbox" checked={hideHp} onChange={(event) => setHideHp(event.target.checked)} /><span>Hide exact HP from players</span></label>
          <label className="game-check"><input type="checkbox" checked={revealStats} onChange={(event) => setRevealStats(event.target.checked)} /><span>Show AC and notes to players</span></label>
        </fieldset>
        {canAddToBattle && <label className="game-check"><input type="checkbox" checked={addToBattle} onChange={(event) => setAddToBattle(event.target.checked)} /><span>Add to the current battle after saving</span></label>}
        <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>Save enemy</button></footer>
      </form>
    </div>
  );
}
