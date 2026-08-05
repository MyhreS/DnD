import { useState, type FormEvent } from "react";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Game } from "@/types";

export function AddMonsterDialog({ game, disabled, onClose }: { game: Game; disabled: boolean; onClose: () => void }) {
  const addMonster = useCombatStore((state) => state.addMonster);
  const [name, setName] = useState("");
  const [maxHp, setMaxHp] = useState("10");
  const [initiative, setInitiative] = useState("10");
  const [ac, setAc] = useState("");
  const [note, setNote] = useState("");
  const [revealHp, setRevealHp] = useState(false);
  const [revealStats, setRevealStats] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim().slice(0, 80);
    if (!cleanName) return;
    const ok = await addMonster(game.id, {
      name: cleanName,
      maxHp: Math.min(9999, Math.max(1, Number.parseInt(maxHp, 10) || 1)),
      initiative: Math.min(99, Math.max(-99, Number.parseInt(initiative, 10) || 0)),
      ac: ac.trim() ? Math.min(99, Math.max(0, Number.parseInt(ac, 10) || 0)) : null,
      note: note.trim().slice(0, 240) || null,
      revealHp,
      revealStats,
    });
    if (ok) onClose();
  }

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="game-dialog" role="dialog" aria-modal="true" aria-labelledby="add-monster-title" onSubmit={submit}>
        <header><div><p className="eyebrow">Encounter</p><h2 id="add-monster-title">Add enemy</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <p className="muted">Add enemies when they enter the story. Their details are hidden from players by default.</p>
        <div className="game-dialog-grid">
          <label className="game-field game-dialog-wide"><span>Name</span><input className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label className="game-field"><span>Max HP</span><input className="input" type="number" min="1" max="9999" value={maxHp} onChange={(event) => setMaxHp(event.target.value)} /></label>
          <label className="game-field"><span>Initiative</span><input className="input" type="number" min="-99" max="99" value={initiative} onChange={(event) => setInitiative(event.target.value)} /></label>
          <label className="game-field"><span>AC</span><input className="input" type="number" min="0" max="99" value={ac} onChange={(event) => setAc(event.target.value)} placeholder="—" /></label>
          <label className="game-field game-dialog-wide"><span>Private notes</span><input className="input" value={note} maxLength={240} onChange={(event) => setNote(event.target.value)} placeholder="Attacks, damage, or reminders" /></label>
        </div>
        <label className="game-check"><input type="checkbox" checked={revealHp} onChange={(event) => setRevealHp(event.target.checked)} /><span>Show exact HP to players</span></label>
        <label className="game-check"><input type="checkbox" checked={revealStats} onChange={(event) => setRevealStats(event.target.checked)} /><span>Show AC and notes to players</span></label>
        <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" disabled={disabled || !name.trim()}>Add enemy</button></footer>
      </form>
    </div>
  );
}

export function EnemySection({ game, isDm, disabled }: { game: Game; isDm: boolean; disabled: boolean }) {
  const combatants = useCombatStore((state) => state.combatants);
  const patch = useCombatStore((state) => state.patch);
  const remove = useCombatStore((state) => state.remove);
  const enemies = combatants.filter((combatant) => combatant.kind === "monster");
  if (!isDm || enemies.length === 0) return null;

  return (
    <section className="game-section game-enemy-section" aria-labelledby="enemies-heading">
      <div className="game-section-heading"><div><p className="eyebrow">DM only</p><h3 id="enemies-heading">Enemies <span>{enemies.length}</span></h3></div></div>
      <div className="game-enemies">
        {enemies.map((enemy) => {
          const max = Math.max(1, enemy.maxHp ?? 1);
          const current = Math.min(max, Math.max(0, enemy.currentHp ?? max));
          const damage = max - current;
          const changeDamage = (delta: number) => void patch(game.id, enemy.id, { currentHp: Math.max(0, Math.min(max, current - delta)) });
          return (
            <article className="game-enemy" key={enemy.id}>
              <div className="game-enemy-title"><div><strong>{enemy.name}</strong><span>Initiative {enemy.initiative}{enemy.ac == null ? "" : ` · AC ${enemy.ac}`}</span></div><strong className="game-damage">{damage}<small> damage</small></strong></div>
              {enemy.note && <p>{enemy.note}</p>}
              <div className="game-damage-controls">
                <button type="button" disabled={disabled || damage <= 0} onClick={() => changeDamage(-1)}>−1</button>
                <button type="button" disabled={disabled || current <= 0} onClick={() => changeDamage(1)}>+1</button>
                <button type="button" disabled={disabled || current <= 0} onClick={() => changeDamage(5)}>+5</button>
                <span>{current} / {max} HP</span>
                <label className="game-inline-check"><input type="checkbox" checked={enemy.revealHp === true} onChange={(event) => void patch(game.id, enemy.id, { revealHp: event.target.checked })} /> HP visible</label>
                <label className="game-inline-check"><input type="checkbox" checked={enemy.revealStats === true} onChange={(event) => void patch(game.id, enemy.id, { revealStats: event.target.checked })} /> Stats visible</label>
                {(game.campaignId !== null || game.status === "lobby") && <button type="button" className="game-text-button" disabled={disabled} onClick={() => void remove(game.id, enemy.id, game, combatants)}>Remove</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
