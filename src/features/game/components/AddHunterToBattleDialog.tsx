import { useMemo } from "react";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Game, GameParticipant, HunterCard } from "@/types";
import { participantInitiative } from "../lib/combatPresentation";

/** Session Hunters who are not in the current battle (never added, or removed
 * from it) and can be brought in with a fresh initiative roll. */
export function AddHunterToBattleDialog({
  game,
  participants,
  characters,
  busy,
  onClose,
}: {
  game: Game;
  participants: GameParticipant[];
  characters: HunterCard[];
  busy: boolean;
  onClose: () => void;
}) {
  const combatants = useCombatStore((state) => state.combatants);
  const addHunters = useCombatStore((state) => state.addHunters);
  const encounterId = game.combat?.encounterId ?? 0;
  const cardsById = useMemo(() => new Map(characters.map((card) => [card.id, card])), [characters]);
  const missing = useMemo(() => {
    const present = new Set(
      combatants
        .filter((combatant) => combatant.kind === "pc" && (combatant.encounterId ?? 0) === encounterId)
        .map((combatant) => combatant.characterId),
    );
    return participants.filter((participant) => participant.characterId && !present.has(participant.characterId));
  }, [combatants, encounterId, participants]);

  async function add(participant: GameParticipant) {
    if (!participant.characterId) return;
    const card = cardsById.get(participant.characterId);
    await addHunters(game.id, [{ characterId: participant.characterId, name: participant.name, dexMod: participantInitiative(card) }], encounterId);
  }

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="game-dialog game-manage-dialog" role="dialog" aria-modal="true" aria-labelledby="add-hunter-battle-title">
        <header><div><p className="eyebrow">Battle</p><h2 id="add-hunter-battle-title">Add a Hunter</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <p className="muted">Hunters in this session who are not in the fight. Initiative is rolled when they join.</p>
        <div className="game-dialog-results">
          {missing.map((participant) => (
            <button data-haptic="light" key={participant.uid} type="button" disabled={busy} onClick={() => void add(participant)}>
              <span><strong>{participant.name}</strong><small>{participant.playerName || "Player"} · Level {participant.level}</small></span>
              <span>Add</span>
            </button>
          ))}
          {missing.length === 0 && <p className="muted">Every Hunter in the session is already in this battle. Add more players from Manage players.</p>}
        </div>
        <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}
