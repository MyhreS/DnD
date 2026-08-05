import { useMemo, type ReactNode } from "react";
import { CONDITION_NAME } from "@/data/conditions";
import { useTurnClock } from "@/features/play/hooks/useTurnClock";
import { formatTurnTime } from "@/features/play/lib/turnTimer";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import type { Combatant, Game, HunterCard, TurnTimerPhase } from "@/types";
import { combatVitals } from "../lib/combatPresentation";
import "./battle-screen.css";

export function SessionBattleView({
  game,
  characters,
  isDm,
  dmControls,
  enemySection,
}: {
  game: Game;
  characters: HunterCard[];
  isDm: boolean;
  dmControls: ReactNode;
  enemySection: ReactNode;
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
          <BattleTimer phaseSource={encounter} combatant={current} />
        </div>
      )}

      {isDm && dmControls}
      {enemySection}
    </main>
  );
}

function phaseLabel(phase: TurnTimerPhase): string {
  if (phase === "briefing") return "Tactical briefing";
  if (phase === "untimed") return "DM turn";
  if (phase === "paused") return "Paused";
  if (phase === "expired") return "Time expired";
  if (phase === "running") return "Turn timer";
  return "Waiting";
}

function BattleTimer({ phaseSource, combatant }: { phaseSource: NonNullable<Game["combat"]>; combatant?: Combatant }) {
  const { phase, remainingMs } = useTurnClock(phaseSource);
  const display = phase === "running" || phase === "paused" || phase === "expired"
    ? formatTurnTime(remainingMs)
    : phase === "briefing"
      ? "Briefing"
      : "No timer";
  return (
    <aside className={`battle-timer battle-timer-${phase}`} aria-live="polite" data-testid="battle-turn-timer">
      <span>{phaseLabel(phase)}</span>
      <strong>{display}</strong>
      <p>{combatant?.name ?? "No active combatant"}</p>
      {phase === "briefing" && <small>Planning only. The Warden starts 90 seconds when they act.</small>}
      {phase === "expired" && <small>Finish the action already begun. No new action may start.</small>}
    </aside>
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
