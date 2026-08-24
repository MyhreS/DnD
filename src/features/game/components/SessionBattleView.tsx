import { useMemo, type ReactNode } from "react";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import type { Game, HunterCard } from "@/types";
import { BattleCombatantRow } from "./BattleCombatantRow";
import { encounterCombatants } from "../lib/combatPresentation";
import "./battle-screen.css";

export function SessionBattleView({
  game,
  characters,
  isDm,
  dmControls,
  disabled,
  onBack,
}: {
  game: Game;
  characters: HunterCard[];
  isDm: boolean;
  dmControls: ReactNode;
  disabled: boolean;
  onBack: () => void;
}) {
  useWakeLock();
  const allCombatants = useCombatStore((state) => state.combatants);
  const encounter = game.combat!;
  const combatants = useMemo(() => encounterCombatants(allCombatants, encounter), [allCombatants, encounter]);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const current = order.find((combatant) => combatant.id === encounter.turnId) ?? order[0];
  const currentPosition = current ? order.findIndex((combatant) => combatant.id === current.id) : -1;
  const next = currentPosition >= 0 && order.length > 1
    ? order[(currentPosition + 1) % order.length]
    : null;
  const round = Math.max(1, encounter.round);

  return (
    <main className="battle-screen game-battle-mode" aria-label={`${game.title} battle screen`} data-testid="session-battle-screen">
      <header className="battle-header">
        <div className="battle-title">
          <button className="battle-back" type="button" onClick={onBack}><span aria-hidden="true">←</span> Session</button>
          <h1>{game.title}</h1>
        </div>
        <div className="battle-round" aria-label={`Round ${round}`}>
          <span>Round</span>
          <strong>{round}</strong>
        </div>
      </header>

      <section className="battle-spotlight" aria-label="Current turn">
        <div className="battle-turn-mark" aria-hidden="true"><span>{currentPosition + 1 || "–"}</span></div>
        <div className="battle-live-status" aria-live="polite">
          <span>Current turn</span>
          <strong>{current?.name ?? "Waiting for initiative"}</strong>
          {current && <small>{current.kind === "monster" ? "Enemy" : "Hunter"} · Turn {currentPosition + 1} of {order.length}</small>}
        </div>
        {next && <div className="battle-next-up"><span>Up next</span><strong>{next.name}</strong></div>}
        {isDm && dmControls}
      </section>

      {order.length === 0 ? (
        <section className="battle-waiting" aria-live="polite">
          <span className="battle-waiting-mark" aria-hidden="true">✦</span>
          <strong>Waiting for initiative</strong>
          <p>The DM is preparing the encounter.</p>
        </section>
      ) : (
        <div className="battle-layout">
          <div className="battle-roster-heading">
            <div>
              <span>Encounter</span>
              <h2>Turn order</h2>
            </div>
            <strong>{order.length} combatant{order.length === 1 ? "" : "s"}</strong>
          </div>
          <section className="battle-order" aria-label="Battle initiative order">
            {order.map((combatant, index) => (
              <BattleCombatantRow
                key={combatant.id}
                combatant={combatant}
                position={index + 1}
                round={round}
                active={combatant.id === encounter.turnId}
                characters={characters}
                game={game}
                canManage={isDm}
                disabled={disabled}
                encounterCombatants={combatants}
              />
            ))}
          </section>
        </div>
      )}

    </main>
  );
}
