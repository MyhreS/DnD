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
  onReturnToBattle,
}: {
  game: Game;
  participants: GameParticipant[];
  characters: HunterCard[];
  isDm: boolean;
  disabled: boolean;
  enemyTemplates: EnemyTemplate[];
  onAddEnemy: (template: EnemyTemplate, encounterId?: number) => Promise<boolean>;
  onReturnToBattle: () => void;
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
  const hunterCount = participants.filter((participant) => participant.characterId).length;
  const battleCopy = encounter.active
    ? `Round ${encounter.round} · ${order.length} combatant${order.length === 1 ? "" : "s"}`
    : hasPreviousBattle
      ? `${order.length} combatant${order.length === 1 ? "" : "s"} saved`
      : `${hunterCount} Hunter${hunterCount === 1 ? "" : "s"} ready`;

  return (
    <section className={`game-combat-stage${encounter.active ? " is-live" : ""}`} aria-labelledby="combat-heading">
      <div className="game-combat-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m5 4 15 15M16 4l4 4L9 19H5v-4L16 4ZM4 20l4-4" /></svg>
      </div>
      <div className="game-combat-copy">
        <p className="eyebrow">{encounter.active ? "Battle in progress" : hasPreviousBattle ? "Battle saved" : "Next move"}</p>
        <h3 id="combat-heading">{encounter.active ? "Return to the fight" : hasPreviousBattle ? "Continue the encounter" : "Ready for battle"}</h3>
        <p>{battleCopy}</p>
      </div>
      {isDm && <div className="game-combat-actions">
        {encounter.active ? (
          <button className="btn btn-primary" type="button" disabled={disabled} onClick={onReturnToBattle}>Return to battle</button>
        ) : hasPreviousBattle ? (<>
          <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => setBattleMode("resume")}>Resume battle</button>
          <button className="game-text-button" type="button" disabled={disabled} onClick={() => setBattleMode("new")}>New battle</button>
        </>) : (
          <button className="btn btn-primary" type="button" disabled={disabled || !canStart} onClick={() => setBattleMode("start")}>Start battle</button>
        )}
      </div>}
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
  const [menuOpen, setMenuOpen] = useState(false);

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <div className="game-battle-toolbar" aria-label="DM battle controls">
      <button className="battle-next-turn" type="button" disabled={disabled || order.length === 0} onClick={() => void nextTurn(game.id, game, combatants)}>
        <span>Finish turn</span>
        <strong>Next turn <span aria-hidden="true">→</span></strong>
      </button>
      <details className="battle-tools" open={menuOpen} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
        <summary aria-label="Battle options"><span aria-hidden="true">•••</span><span>Battle options</span></summary>
        <div className="battle-tools-menu">
          <button type="button" aria-label="Add enemy" disabled={disabled} onClick={() => runMenuAction(onAddEnemy)}><span aria-hidden="true">＋</span><span><strong>Add enemy</strong><small>Bring another foe into combat</small></span></button>
          {canCreateItem && <button type="button" aria-label="Create item" disabled={disabled} onClick={() => runMenuAction(onCreateItem)}><span aria-hidden="true">◇</span><span><strong>Create item</strong><small>Add loot found in this session</small></span></button>}
          <button className="battle-end" type="button" aria-label="End battle" disabled={disabled} onClick={() => runMenuAction(onEndBattle)}><span aria-hidden="true">×</span><span><strong>End battle</strong><small>Save this encounter and leave combat</small></span></button>
        </div>
      </details>
    </div>
  );
}
