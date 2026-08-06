import { useState } from "react";
import type { EnemyTemplate } from "@/types";

export function EnemyLibraryDialog({
  templates,
  busy,
  canAddToBattle,
  onAdd,
  onEdit,
  onArchive,
  onNew,
  onClose,
}: {
  templates: EnemyTemplate[];
  busy: boolean;
  canAddToBattle: boolean;
  onAdd: (template: EnemyTemplate) => Promise<void>;
  onEdit: (template: EnemyTemplate) => void;
  onArchive: (template: EnemyTemplate, archived: boolean) => Promise<void>;
  onNew: () => void;
  onClose: () => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const visible = templates.filter((template) => showArchived || !template.archived);

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="game-dialog game-enemy-library" role="dialog" aria-modal="true" aria-labelledby="enemy-library-title">
        <header><div><p className="eyebrow">DM only</p><h2 id="enemy-library-title">Manage enemies</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <div className="game-library-toolbar">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={onNew}>New enemy</button>
          <label className="game-check"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /><span>Show archived</span></label>
        </div>
        {visible.length === 0 ? <p className="muted">No enemies saved yet.</p> : (
          <div className="game-library-list">
            {visible.map((template) => (
              <article key={template.id} className={template.archived ? "is-archived" : ""}>
                <div><strong>{template.name}</strong><span>{template.maxHp} HP · Initiative {template.initiative} · AC {template.ac ?? "—"}</span>{template.note && <small>{template.note}</small>}</div>
                <div className="game-library-actions">
                  {canAddToBattle && !template.archived && <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void onAdd(template)}>Add to battle</button>}
                  <button className="game-text-button" type="button" disabled={busy} onClick={() => onEdit(template)}>Edit</button>
                  <button className="game-text-button" type="button" disabled={busy} onClick={() => void onArchive(template, !template.archived)}>{template.archived ? "Restore" : "Archive"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}
