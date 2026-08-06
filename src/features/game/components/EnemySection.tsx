import { useCombatStore } from "@/features/play/store/combatStore";
import type { Game } from "@/types";

export function EnemySection({ game, isDm, disabled }: { game: Game; isDm: boolean; disabled: boolean }) {
  const combatants = useCombatStore((state) => state.combatants);
  const patch = useCombatStore((state) => state.patch);
  const remove = useCombatStore((state) => state.remove);
  const resetMonster = useCombatStore((state) => state.resetMonster);
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
                <button type="button" className="game-text-button" disabled={disabled} onClick={() => void resetMonster(game.id, enemy.id)}>Reset stats</button>
                {(game.campaignId !== null || game.status === "lobby") && <button type="button" className="game-text-button" disabled={disabled} onClick={() => void remove(game.id, enemy.id, game, combatants)}>Remove</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
