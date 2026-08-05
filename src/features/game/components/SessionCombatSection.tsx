import { useMemo, useState } from "react";
import { CONDITIONS, CONDITION_NAME } from "@/data/conditions";
import { CombatTurnTimer } from "@/features/play/components/CombatTurnTimer";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, GameParticipant, HunterCard } from "@/types";
import { combatVitals, isWarden, participantInitiative } from "../lib/combatPresentation";

function battleHref(gameId: string): string {
  const preview = new URLSearchParams(window.location.search).get("preview");
  return `/game/${encodeURIComponent(gameId)}/battle${preview ? `?preview=${encodeURIComponent(preview)}` : ""}`;
}

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
  const closeSessionEncounter = useCombatStore((state) => state.closeSessionEncounter);
  const patch = useCombatStore((state) => state.patch);
  const toggleCondition = useCombatStore((state) => state.toggleCondition);
  const nextTurn = useCombatStore((state) => state.nextTurn);
  const designateWarden = useCombatStore((state) => state.designateWarden);
  const startTimer = useCombatStore((state) => state.startTimer);
  const pauseTimer = useCombatStore((state) => state.pauseTimer);
  const resumeTimer = useCombatStore((state) => state.resumeTimer);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const encounter = game.combat ?? emptyEncounter();
  const current = order.find((combatant) => combatant.id === encounter.turnId) ?? order[0];
  const wardens = order.filter((combatant) => combatant.kind === "pc" && combatant.isWarden);
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

  async function endBattle() {
    if (!window.confirm("End this battle? Initiative, conditions, enemies, and damage remain saved in the session.")) return;
    await closeSessionEncounter(game.id, encounter);
  }

  const canStart = participants.some((participant) => participant.characterId) || combatants.length > 0;
  const hasPreviousBattle = encounter.round > 0;

  return (
    <section className="game-section game-combat" aria-labelledby="combat-heading">
      <div className="game-section-heading game-combat-heading">
        <div>
          <p className="eyebrow">Battle</p>
          <h3 id="combat-heading">
            {encounter.active ? `Round ${Math.max(1, encounter.round)}` : "Initiative"}
            <span> · {order.length} combatant{order.length === 1 ? "" : "s"}</span>
          </h3>
        </div>
        <a className="btn btn-ghost game-battle-screen-link" href={battleHref(game.id)} target="_blank" rel="noreferrer">
          Open battle screen ↗
        </a>
      </div>

      {!encounter.active ? (
        <div className="game-combat-idle">
          <p>{hasPreviousBattle ? "The previous battle remains saved. Resume it with the same combatants." : "Start battle to roll the Hunters into initiative. Prepared enemies are kept."}</p>
          {isDm && (
            <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => void startBattle()}>
              {hasPreviousBattle ? "Resume battle" : "Start battle"}
            </button>
          )}
        </div>
      ) : (
        <>
          <CombatTurnTimer
            encounter={encounter}
            combatantName={current?.name}
            controls={isDm}
            onStart={() => void startTimer(game.id, game)}
            onPause={() => void pauseTimer(game.id, game)}
            onResume={() => void resumeTimer(game.id, game)}
          />

          {isDm && wardens.length > 1 && (
            <label className="combat-warden-select">
              <span>Tactical briefing</span>
              <select
                className="input"
                aria-label="Hunter Warden with Tactical Briefing"
                value={encounter.designatedWardenId ?? ""}
                onChange={(event) => void designateWarden(game.id, game, combatants, event.target.value)}
              >
                <option value="">No designated Warden</option>
                {wardens.map((warden) => <option key={warden.id} value={warden.id}>{warden.name}</option>)}
              </select>
              <small>Only the selected Warden receives unlimited planning before their 90 seconds begin.</small>
            </label>
          )}

          <div className="game-combat-actions">
            {isDm && (
              <>
                <button className="btn btn-primary" type="button" disabled={disabled || order.length === 0} onClick={() => void nextTurn(game.id, game, combatants)}>Next turn</button>
                <button className="btn btn-ghost" type="button" disabled={disabled} onClick={() => void endBattle()}>End battle</button>
              </>
            )}
          </div>

          <div className="game-initiative" aria-label="Initiative order">
            {order.map((combatant, index) => (
              <InitiativeControlRow
                key={`${combatant.id}:${combatant.initiative}`}
                combatant={combatant}
                position={index + 1}
                round={Math.max(1, encounter.round)}
                active={combatant.id === encounter.turnId}
                characters={characters}
                canEdit={isDm}
                disabled={disabled}
                onInitiative={(initiative) => patch(game.id, combatant.id, { initiative })}
                onToggleCondition={(conditionId) => toggleCondition(game.id, combatant, conditionId, Math.max(1, encounter.round))}
              />
            ))}
          </div>
        </>
      )}
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
