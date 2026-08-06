import { useMemo, type ReactNode } from "react";
import { CONDITION_NAME } from "@/data/conditions";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import type { Combatant, Game, HunterCard } from "@/types";
import { combatVitals } from "../lib/combatPresentation";
import "./battle-screen.css";

export function SessionBattleView({
  game,
  characters,
  isDm,
  dmControls,
}: {
  game: Game;
  characters: HunterCard[];
  isDm: boolean;
  dmControls: ReactNode;
}) {
  useWakeLock();
  const combatants = useCombatStore((state) => state.combatants);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const encounter = game.combat!;
  const current = order.find((combatant) => combatant.id === encounter.turnId) ?? order[0];

  return (
    <main className="battle-screen game-battle-mode" aria-label={`${game.title} battle screen`} data-testid="session-battle-screen">
      <header className="battle-header">
        <div className="battle-title">
          <h1>{game.title}</h1>
          <p>Round {Math.max(1, encounter.round)}</p>
        </div>
        <div className="battle-live-status" aria-live="polite">
          <span>Current turn</span>
          <strong>{current?.name ?? "Waiting for initiative"}</strong>
        </div>
      </header>

      {isDm && dmControls}

      {order.length === 0 ? (
        <section className="battle-waiting" aria-live="polite">
          <strong>Waiting for initiative</strong>
          <p>The DM is preparing the encounter.</p>
        </section>
      ) : (
        <div className="battle-layout">
          <section className="battle-order" aria-label="Battle initiative order">
            <div className="battle-column-headings" aria-hidden="true">
              <span>Order</span><span>Combatant</span><span>Initiative</span><span>Damage</span><span>AC</span><span>Conditions</span>
            </div>
            {order.map((combatant, index) => (
              <BattleRow
                key={combatant.id}
                combatant={combatant}
                position={index + 1}
                round={Math.max(1, encounter.round)}
                active={combatant.id === encounter.turnId}
                characters={characters}
              />
            ))}
          </section>
        </div>
      )}

    </main>
  );
}

function BattleRow({
  combatant,
  position,
  round,
  active,
  characters,
}: {
  combatant: Combatant;
  position: number;
  round: number;
  active: boolean;
  characters: HunterCard[];
}) {
  const vitals = combatVitals(combatant, characters);
  const damagePercent = vitals.maxHp && vitals.damageTaken !== null
    ? Math.min(100, (vitals.damageTaken / vitals.maxHp) * 100)
    : 0;
  return (
    <article className={active ? "battle-row is-current" : "battle-row"} data-testid={`battle-combatant-${combatant.id}`}>
      <span className="battle-position">{position}</span>
      <div className="battle-name">
        <strong>{combatant.name}</strong>
        <span>{combatant.kind === "monster" ? "Enemy" : "Hunter"}</span>
      </div>
      <strong className="battle-initiative">{combatant.initiative}</strong>
      <div className="battle-damage">
        <strong>{vitals.damageTaken ?? "—"}</strong>
        <span>taken</span>
        {vitals.maxHp !== null && <div className="battle-damage-track" aria-hidden="true"><span style={{ width: `${damagePercent}%` }} /></div>}
      </div>
      <strong className="battle-ac">{vitals.ac ?? "—"}</strong>
      <div className="battle-conditions">
        {combatant.conditions.length === 0 ? <span>None</span> : combatant.conditions.map((conditionId) => {
          const since = combatant.conditionSince?.[conditionId];
          const rounds = since ? Math.max(1, round - since + 1) : null;
          return <span key={conditionId}>{CONDITION_NAME[conditionId] ?? conditionId}{rounds ? ` · ${rounds}r` : ""}</span>;
        })}
      </div>
    </article>
  );
}
