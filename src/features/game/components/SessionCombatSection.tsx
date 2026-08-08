import { useMemo, useState } from "react";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import type { EnemyTemplate, Game, GameParticipant, HunterCard } from "@/types";
import { hasSavedBattle, isWarden, participantInitiative } from "../lib/combatPresentation";
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
  onAddEnemy: (template: EnemyTemplate) => Promise<boolean>;
}) {
  const combatants = useCombatStore((state) => state.combatants);
  const startSessionEncounter = useCombatStore((state) => state.startSessionEncounter);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const encounter = game.combat ?? emptyEncounter();
  const cardsById = useMemo(() => new Map(characters.map((card) => [card.id, card])), [characters]);
  const [choosingEnemies, setChoosingEnemies] = useState(false);

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
    for (const template of selectedEnemies) {
      const added = await onAddEnemy(template);
      if (!added) return;
    }
    const latestCombatants = useCombatStore.getState().combatants;
    const started = await startSessionEncounter(game.id, pcs, latestCombatants, encounter);
    if (started) setChoosingEnemies(false);
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
          <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => setChoosingEnemies(true)}>
            {hasPreviousBattle ? "Resume battle screen" : "Start battle screen"}
          </button>
        )}
      </div>
      {choosingEnemies && (
        <StartBattleDialog
          templates={enemyTemplates}
          preparedCount={combatants.length}
          resuming={hasPreviousBattle}
          busy={disabled}
          onStart={startBattle}
          onClose={() => setChoosingEnemies(false)}
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
  const combatants = useCombatStore((state) => state.combatants);
  const nextTurn = useCombatStore((state) => state.nextTurn);
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
