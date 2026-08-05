import { useState, type FormEvent } from "react";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Game } from "@/types";

export function EnemySection({ game, isDm, disabled }: { game: Game; isDm: boolean; disabled: boolean }) {
  const combatants = useCombatStore((state) => state.combatants);
  const addMonster = useCombatStore((state) => state.addMonster);
  const patch = useCombatStore((state) => state.patch);
  const remove = useCombatStore((state) => state.remove);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [maxHp, setMaxHp] = useState("10");
  const [initiative, setInitiative] = useState("10");
  const [ac, setAc] = useState("");
  const [note, setNote] = useState("");
  const enemies = combatants.filter((combatant) => combatant.kind === "monster");

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
    });
    if (ok) {
      setName("");
      setMaxHp("10");
      setInitiative("10");
      setAc("");
      setNote("");
      setAdding(false);
    }
  }

  function changeDamage(id: string, currentHp: number, max: number, delta: number) {
    void patch(game.id, id, { currentHp: Math.min(max, Math.max(0, currentHp - delta)) });
  }

  return (
    <section className="game-section battle-enemies" aria-labelledby="enemies-heading">
      <div className="game-section-heading">
        <div>
          <p className="eyebrow">Encounter</p>
          <h3 id="enemies-heading">Enemies <span>{enemies.length}</span></h3>
        </div>
        {isDm && game.status !== "ended" && <button type="button" className="game-text-button" onClick={() => setAdding((value) => !value)}>{adding ? "Cancel" : "+ Add enemy"}</button>}
      </div>
      {adding && (
        <form className="game-enemy-form" onSubmit={submit}>
          <label className="game-field game-enemy-name"><span>Name</span><input className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label className="game-field"><span>Max HP</span><input className="input" type="number" min="1" max="9999" value={maxHp} onChange={(event) => setMaxHp(event.target.value)} /></label>
          <label className="game-field"><span>Initiative</span><input className="input" type="number" min="-99" max="99" value={initiative} onChange={(event) => setInitiative(event.target.value)} /></label>
          <label className="game-field"><span>AC</span><input className="input" type="number" min="0" max="99" value={ac} onChange={(event) => setAc(event.target.value)} placeholder="—" /></label>
          <label className="game-field game-enemy-note"><span>Notes</span><input className="input" value={note} maxLength={240} onChange={(event) => setNote(event.target.value)} placeholder="Attacks or reminders" /></label>
          <button className="btn btn-primary" type="submit" disabled={disabled || !name.trim()}>Add enemy</button>
        </form>
      )}
      {enemies.length === 0 ? <p className="muted">No enemies have been added.</p> : (
        <div className="game-enemies">
          {enemies.map((enemy) => {
            const max = Math.max(1, enemy.maxHp ?? 1);
            const current = Math.min(max, Math.max(0, enemy.currentHp ?? max));
            const damage = max - current;
            return (
              <article className="game-enemy" key={enemy.id}>
                <div className="game-enemy-title">
                  <div><strong>{enemy.name}</strong><span>Initiative {enemy.initiative}{enemy.ac == null ? "" : ` · AC ${enemy.ac}`}</span></div>
                  <strong className="game-damage">{damage}<small> damage taken</small></strong>
                </div>
                <div className="game-damage-track" aria-label={`${enemy.name} has taken ${damage} damage`}><span style={{ width: `${Math.min(100, (damage / max) * 100)}%` }} /></div>
                {enemy.note && <p>{enemy.note}</p>}
                {isDm && game.status !== "ended" && (
                  <div className="game-damage-controls">
                    <button type="button" disabled={disabled || damage <= 0} aria-label={`Heal ${enemy.name} by 1`} onClick={() => changeDamage(enemy.id, current, max, -1)}>−1</button>
                    <button type="button" disabled={disabled || current <= 0} aria-label={`Damage ${enemy.name} by 1`} onClick={() => changeDamage(enemy.id, current, max, 1)}>+1</button>
                    <button type="button" disabled={disabled || current <= 0} aria-label={`Damage ${enemy.name} by 5`} onClick={() => changeDamage(enemy.id, current, max, 5)}>+5</button>
                    <span>{current} / {max} HP</span>
                    {game.status === "lobby" && (
                      <button type="button" className="game-text-button" disabled={disabled} onClick={() => void remove(game.id, enemy.id, game, combatants)}>Remove</button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
