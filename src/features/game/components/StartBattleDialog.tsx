import { useState } from "react";
import type { EnemyTemplate } from "@/types";

export function StartBattleDialog({
  templates,
  preparedCount,
  resuming,
  busy,
  onStart,
  onClose,
}: {
  templates: EnemyTemplate[];
  preparedCount: number;
  resuming: boolean;
  busy: boolean;
  onStart: (selected: EnemyTemplate[]) => Promise<void>;
  onClose: () => void;
}) {
  const available = templates.filter((template) => !template.archived);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="game-dialog game-start-battle" role="dialog" aria-modal="true" aria-labelledby="start-battle-title">
        <header><div><p className="eyebrow">Battle</p><h2 id="start-battle-title">{resuming ? "Resume battle" : "Choose enemies"}</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <p className="muted">Select saved enemies to add. {preparedCount > 0 ? `${preparedCount} prepared combatant${preparedCount === 1 ? " is" : "s are"} already included.` : "Hunters are included automatically."}</p>
        {available.length === 0 ? <p className="game-dialog-note">Your enemy library is empty. You can still start with the Hunters.</p> : (
          <div className="game-battle-picker">
            {available.map((template) => (
              <label key={template.id}>
                <input type="checkbox" checked={selected.has(template.id)} onChange={() => toggle(template.id)} />
                <span><strong>{template.name}</strong><small>{template.maxHp} HP · Initiative {template.initiative} · AC {template.ac ?? "—"}</small></span>
              </label>
            ))}
          </div>
        )}
        <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="button" disabled={busy} onClick={() => void onStart(available.filter((template) => selected.has(template.id)))}>{resuming ? "Resume battle" : "Start battle"}</button></footer>
      </section>
    </div>
  );
}
