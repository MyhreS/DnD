import { useMemo, type ReactNode } from "react";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import { useCharactersSync } from "@/features/play/hooks/useCharactersSync";
import type { Game, HunterCard } from "@/types";
import { BattleCombatantRow } from "./BattleCombatantRow";
import { BattleFallenRoster } from "./BattleFallenRoster";
import { BattleTurnTrack } from "./BattleTurnTrack";
import { encounterCombatants } from "../lib/combatPresentation";
import { useStickyTopbarOffset } from "../hooks/useStickyTopbarOffset";
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
  useStickyTopbarOffset();
  // The fallen roster reads the shared archive subscription.
  useCharactersSync();
  const allCombatants = useCombatStore((state) => state.combatants);
  const loaded = useCombatStore((state) => state.loaded);
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
        <button className="battle-back" type="button" onClick={onBack}><span aria-hidden="true">←</span> Session</button>
        <h1>{game.title}</h1>
      </header>

      <section className="battle-command" aria-label="Current turn">
        <div className="battle-round" aria-label={`Round ${round}`}>
          <span>Round</span>
          <strong>{round}</strong>
        </div>
        <div className="battle-live-status" aria-live="polite">
          <span><em className="battle-round-inline">Round {round} · </em>{current ? `Turn ${currentPosition + 1} of ${order.length}` : "Current turn"}</span>
          <strong className={current?.kind === "monster" ? "is-monster" : undefined}>{current?.name ?? (loaded ? "Waiting for initiative" : "Loading…")}</strong>
        </div>
        <div className="battle-next-up">
          <span>Up next</span>
          <strong>{next?.name ?? "—"}</strong>
        </div>
        {isDm && dmControls}
      </section>

      {order.length > 0 && <BattleTurnTrack order={order} currentId={current?.id ?? null} characters={characters} />}

      {order.length === 0 && !loaded ? (
        <section className="battle-waiting" aria-live="polite" data-testid="battle-loading">
          <span className="btn-spinner battle-loading-spinner" aria-hidden="true" />
          <strong>Loading the battle…</strong>
          <p>Fetching every combatant from the table.</p>
        </section>
      ) : order.length === 0 ? (
        <section className="battle-waiting" aria-live="polite">
          <span className="battle-waiting-mark" aria-hidden="true">✦</span>
          <strong>Waiting for initiative</strong>
          <p>The DM is preparing the encounter.</p>
        </section>
      ) : (
        <section className={`battle-order${isDm ? " has-actions" : ""}`} aria-label="Battle initiative order">
          {order.map((combatant, index) => (
            <BattleCombatantRow
              key={combatant.id}
              combatant={combatant}
              position={index + 1}
              round={round}
              active={combatant.id === current?.id}
              characters={characters}
              game={game}
              canManage={isDm}
              disabled={disabled}
              encounterCombatants={combatants}
            />
          ))}
        </section>
      )}

      <BattleFallenRoster gameId={game.id} isDm={isDm} disabled={disabled} />
    </main>
  );
}
