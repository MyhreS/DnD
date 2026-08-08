import { useMemo, useState } from "react";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import type { EnemyTemplate, Game, GameParticipant, HunterCard } from "@/types";
import { encounterCombatants, hasSavedBattle, isWarden, participantInitiative } from "../lib/combatPresentation";
import { StartBattleDialog } from "./StartBattleDialog";

export function SessionCombatSection({
  game,
  participants,
  characters,
  isDm,
  disabled,
  enemyTemplates,
  onAddEnemy,
}: {
  game: Game;
  participants: GameParticipant[];
  characters: HunterCard[];
  isDm: boolean;
  disabled: boolean;
  enemyTemplates: EnemyTemplate[];
  onAddEnemy: (template: EnemyTemplate, encounterId?: number) => Promise<boolean>;
}) {
  const allCombatants = useCombatStore((state) => state.combatants);
  const startSessionEncounter = useCombatStore((state) => state.startSessionEncounter);
  const startNewSessionEncounter = useCombatStore((state) => state.startNewSessionEncounter);
  const encounter = game.combat ?? emptyEncounter();
  const combatants = useMemo(() => encounterCombatants(allCombatants, encounter), [allCombatants, encounter]);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const cardsById = useMemo(() => new Map(characters.map((card) => [card.id, card])), [characters]);
  const [battleMode, setBattleMode] = useState<"start" | "resume" | "new" | null>(null);

  async function startBattle(selectedEnemies: EnemyTemplate[]) {
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
    const encounterId = battleMode === "new" ? encounter.encounterId + 1 : encounter.encounterId;
    for (const template of selectedEnemies) {
      const added = await onAddEnemy(template, encounterId);
      if (!added) return;
    }
    const latestCombatants = useCombatStore.getState().combatants;
    const currentEncounter = { ...encounter, encounterId };
    const started = battleMode === "new"
      ? await startNewSessionEncounter(game.id, pcs, encounterCombatants(latestCombatants, currentEncounter), encounterId)
      : await startSessionEncounter(game.id, pcs, encounterCombatants(latestCombatants, encounter), encounter);
    if (started) setBattleMode(null);
  }

  const canStart = participants.some((participant) => participant.characterId)
    || combatants.length > 0
    || enemyTemplates.some((template) => !template.archived);
  const hasPreviousBattle = hasSavedBattle(encounter);

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
          hasPreviousBattle ? (
            <div className="game-combat-actions">
              <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => setBattleMode("resume")}>Resume battle</button>
              <button className="btn btn-ghost" type="button" disabled={disabled} onClick={() => setBattleMode("new")}>Start new battle</button>
            </div>
          ) : <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => setBattleMode("start")}>Start battle</button>
        )}
      </div>
      {battleMode && (
        <StartBattleDialog
          templates={enemyTemplates}
          preparedCount={combatants.length}
          mode={battleMode}
          busy={disabled}
          onStart={startBattle}
          onClose={() => setBattleMode(null)}
        />
      )}
    </section>
  );
}

export function SessionCombatControls({
  game,
  disabled,
  onAddEnemy,
  onCreateItem,
  canCreateItem,
  onEndBattle,
}: {
  game: Game;
  disabled: boolean;
  onAddEnemy: () => void;
  onCreateItem: () => void;
  canCreateItem: boolean;
  onEndBattle: () => void;
}) {
  const allCombatants = useCombatStore((state) => state.combatants);
  const nextTurn = useCombatStore((state) => state.nextTurn);
  const combatants = useMemo(() => encounterCombatants(allCombatants, game.combat ?? emptyEncounter()), [allCombatants, game.combat]);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);

  return (
    <div className="game-battle-toolbar" aria-label="DM battle controls">
      <button className="btn btn-primary" type="button" disabled={disabled || order.length === 0} onClick={() => void nextTurn(game.id, game, combatants)}>Next turn</button>
      <button className="btn btn-ghost" type="button" disabled={disabled} onClick={onAddEnemy}>Add enemy</button>
      {canCreateItem && <button className="btn btn-ghost" type="button" disabled={disabled} onClick={onCreateItem}>Create item</button>}
      <button className="game-text-button game-danger-text" type="button" disabled={disabled} onClick={onEndBattle}>End battle</button>
    </div>
  );
}
