import { useMemo, useState } from "react";
import { CONDITIONS, CONDITION_NAME } from "@/data/conditions";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, GameParticipant, HunterCard } from "@/types";
import { combatVitals, isWarden, participantInitiative } from "../lib/combatPresentation";

export function SessionCombatSection({
  game,
  participants,
  characters,
  isDm,
  disabled,
}: {
  game: Game;
  participants: GameParticipant[];
  characters: HunterCard[];
  isDm: boolean;
  disabled: boolean;
}) {
  const combatants = useCombatStore((state) => state.combatants);
  const startSessionEncounter = useCombatStore((state) => state.startSessionEncounter);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const encounter = game.combat ?? emptyEncounter();
  const cardsById = useMemo(() => new Map(characters.map((card) => [card.id, card])), [characters]);

  async function startBattle() {
    const pcs = participants.flatMap((participant) => {
      if (!participant.characterId) return [];
      const card = cardsById.get(participant.characterId);
      return [{
        characterId: participant.characterId,
        name: participant.name,
        dexMod: participantInitiative(card),
        isWarden: isWarden(card, participant.classId, participant.className),
      }];
    });
    await startSessionEncounter(game.id, pcs, combatants, encounter);
  }

  const canStart = participants.some((participant) => participant.characterId) || combatants.length > 0;
  // Older standalone sessions were mistakenly created at round 1, so round
  // alone is not evidence that anyone actually opened the battle screen.
  const hasPreviousBattle = encounter.round > 1
    || encounter.turnId !== null
    || encounter.timerPhase !== "idle";

  return (
    <section className="game-section game-combat" aria-labelledby="combat-heading">
      <div className="game-section-heading game-combat-heading">
        <div>
          <p className="eyebrow">Battle</p>
          <h3 id="combat-heading">Initiative <span> · {order.length} combatant{order.length === 1 ? "" : "s"}</span></h3>
        </div>
      </div>
      <div className="game-combat-idle">
        <p>{hasPreviousBattle ? "The previous battle remains saved. Resume it with the same combatants." : "Start battle to move everyone into the shared battle view. Prepared enemies are kept."}</p>
        {isDm && (
          <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => void startBattle()}>
            {hasPreviousBattle ? "Resume battle screen" : "Start battle screen"}
          </button>
        )}
      </div>
    </section>
  );
}

export function SessionCombatControls({
  game,
  characters,
  disabled,
}: {
  game: Game;
  characters: HunterCard[];
  disabled: boolean;
}) {
  const combatants = useCombatStore((state) => state.combatants);
  const closeSessionEncounter = useCombatStore((state) => state.closeSessionEncounter);
  const patch = useCombatStore((state) => state.patch);
  const toggleCondition = useCombatStore((state) => state.toggleCondition);
  const nextTurn = useCombatStore((state) => state.nextTurn);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const encounter = game.combat ?? emptyEncounter();

  async function endBattle() {
    if (!window.confirm("End this battle? Everyone will return to the session view. Initiative, conditions, enemies, and damage remain saved.")) return;
    await closeSessionEncounter(game.id, encounter);
  }

  return (
    <section className="game-section game-battle-controls" aria-labelledby="battle-controls-heading">
      <div className="game-section-heading">
        <div>
          <p className="eyebrow">DM controls</p>
          <h3 id="battle-controls-heading">Run battle</h3>
        </div>
        <div className="game-combat-actions">
          <button className="btn btn-primary" type="button" disabled={disabled || order.length === 0} onClick={() => void nextTurn(game.id, game, combatants)}>Next turn</button>
          <button className="btn btn-ghost" type="button" disabled={disabled} onClick={() => void endBattle()}>End battle</button>
        </div>
      </div>

      <div className="game-initiative" aria-label="DM initiative controls">
        {order.map((combatant, index) => (
          <InitiativeControlRow
            key={`${combatant.id}:${combatant.initiative}`}
            combatant={combatant}
            position={index + 1}
            round={Math.max(1, encounter.round)}
            active={combatant.id === encounter.turnId}
            characters={characters}
            canEdit
            disabled={disabled}
            onInitiative={(initiative) => patch(game.id, combatant.id, { initiative })}
            onToggleCondition={(conditionId) => toggleCondition(game.id, combatant, conditionId, Math.max(1, encounter.round))}
          />
        ))}
      </div>
    </section>
  );
}

function InitiativeControlRow({
  combatant,
  position,
  round,
  active,
  characters,
  canEdit,
  disabled,
  onInitiative,
  onToggleCondition,
}: {
  combatant: Combatant;
  position: number;
  round: number;
  active: boolean;
  characters: HunterCard[];
  canEdit: boolean;
  disabled: boolean;
  onInitiative: (initiative: number) => Promise<boolean>;
  onToggleCondition: (conditionId: string) => Promise<boolean>;
}) {
  const [initiative, setInitiative] = useState(String(combatant.initiative));
  const vitals = combatVitals(combatant, characters);

  function saveInitiative() {
    const value = Math.min(99, Math.max(-99, Number.parseInt(initiative, 10) || 0));
    setInitiative(String(value));
    if (value !== combatant.initiative) void onInitiative(value);
  }

  return (
    <article className={active ? "game-initiative-row is-current" : "game-initiative-row"}>
      <span className="game-initiative-position">{position}</span>
      <div className="game-initiative-name">
        <strong>{combatant.name}</strong>
        <span>{combatant.kind === "monster" ? "Enemy" : "Hunter"}</span>
      </div>
      <label className="game-initiative-score">
        <span>Initiative</span>
        {canEdit ? (
          <input
            aria-label={`${combatant.name} initiative`}
            type="number"
            min="-99"
            max="99"
            disabled={disabled}
            value={initiative}
            onChange={(event) => setInitiative(event.target.value)}
            onBlur={saveInitiative}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          />
        ) : <strong>{combatant.initiative}</strong>}
      </label>
      <div className="game-initiative-vitals">
        <span>{vitals.damageTaken ?? "—"} damage</span>
        <span>AC {vitals.ac ?? "—"}</span>
      </div>
      <div className="game-condition-controls">
        <div className="game-condition-list">
          {combatant.conditions.length === 0 && <span className="game-no-conditions">No conditions</span>}
          {combatant.conditions.map((conditionId) => {
            const since = combatant.conditionSince?.[conditionId];
            const rounds = since ? Math.max(1, round - since + 1) : null;
            return canEdit ? (
              <button key={conditionId} type="button" disabled={disabled} onClick={() => void onToggleCondition(conditionId)}>
                {CONDITION_NAME[conditionId] ?? conditionId}{rounds ? ` · ${rounds}r` : ""} ×
              </button>
            ) : (
              <span key={conditionId}>{CONDITION_NAME[conditionId] ?? conditionId}{rounds ? ` · ${rounds}r` : ""}</span>
            );
          })}
        </div>
        {canEdit && (
          <select
            aria-label={`Add condition to ${combatant.name}`}
            value=""
            disabled={disabled || combatant.conditions.length >= CONDITIONS.length}
            onChange={(event) => { if (event.target.value) void onToggleCondition(event.target.value); }}
          >
            <option value="">Add condition…</option>
            {CONDITIONS.filter((condition) => !combatant.conditions.includes(condition.id)).map((condition) => (
              <option key={condition.id} value={condition.id}>{condition.name}</option>
            ))}
          </select>
        )}
      </div>
    </article>
  );
}
