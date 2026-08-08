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

  return (
    <main className="battle-screen game-battle-mode" aria-label={`${game.title} battle screen`} data-testid="session-battle-screen">
      <header className="battle-header">
        <div className="battle-title">
          <button className="battle-back" type="button" onClick={onBack}>← Session</button>
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
              <span>Order</span><span>Combatant</span><span>Initiative</span><span>Damage</span><span>AC</span><span>Conditions</span>{isDm && <span>Actions</span>}
            </div>
            {order.map((combatant, index) => (
              <BattleCombatantRow
                key={combatant.id}
                combatant={combatant}
                position={index + 1}
                round={Math.max(1, encounter.round)}
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
