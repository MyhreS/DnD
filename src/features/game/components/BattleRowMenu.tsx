import { useState } from "react";
import { createPortal } from "react-dom";
import { useCombatStore } from "@/features/play/store/combatStore";
import { useCharactersStore } from "@/features/play/store/charactersStore";
import type { Combatant, Game, HunterCard } from "@/types";
import type { CombatVitals } from "../lib/combatPresentation";
import { HunterDeathDialog } from "./HunterDeathDialog";

/** The per-combatant ••• menu on a battle row: enemy switches, the Hunter death
 * action (with its Favor prompt) and removal. */
export function BattleRowMenu({
  combatant,
  game,
  vitals,
  hunterCard,
  dead,
  disabled,
  encounterCombatants,
  onAddDamage,
  onSetMaxHp,
}: {
  combatant: Combatant;
  game: Game;
  vitals: CombatVitals;
  hunterCard: HunterCard | undefined;
  dead: boolean;
  disabled: boolean;
  encounterCombatants: Combatant[];
  onAddDamage: (amount: number) => void;
  onSetMaxHp: (maxHp: number) => void;
}) {
  const patch = useCombatStore((state) => state.patch);
  const remove = useCombatStore((state) => state.remove);
  const resetMonster = useCombatStore((state) => state.resetMonster);
  const killCharacter = useCharactersStore((state) => state.killCharacter);
  const charactersBusy = useCharactersStore((state) => state.busy);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deathOpen, setDeathOpen] = useState(false);
  const [maxHpDraft, setMaxHpDraft] = useState("");
  const unknownHp = combatant.kind === "monster" && vitals.maxHp === null;

  function runMenuAction(action: () => void | Promise<unknown>) {
    setMenuOpen(false);
    void action();
  }

  /** Archive the Hunter (the Favor decision is already made) and leave the row
   * marked dead so the initiative order shows what happened. */
  async function confirmDeath(spendFavor: boolean) {
    if (!hunterCard) return;
    setDeathOpen(false);
    const killed = await killCharacter(hunterCard, game.id, spendFavor);
    if (killed) await patch(game.id, combatant.id, { defeated: true });
  }

  return (
    <div className="battle-row-actions">
      <details className="battle-more" open={menuOpen} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
        <summary aria-label={`More options for ${combatant.name}`}>•••</summary>
        <div className="battle-more-menu">
          {combatant.kind === "monster" && <>
            <button
              className="battle-death-toggle"
              type="button"
              aria-label={dead ? `Revive ${combatant.name}` : `Kill ${combatant.name}`}
              aria-pressed={dead}
              disabled={disabled}
              onClick={() => runMenuAction(() => patch(game.id, combatant.id, unknownHp ? { defeated: !dead } : { currentHp: dead ? 1 : 0, defeated: !dead }))}
            >{dead ? "Revive" : "Kill enemy"}</button>
            {unknownHp && <form className="battle-more-maxhp" onSubmit={(event) => {
              event.preventDefault();
              const maxHp = Math.min(9999, Number.parseInt(maxHpDraft, 10) || 0);
              if (maxHp < 1) return;
              setMaxHpDraft("");
              runMenuAction(() => onSetMaxHp(maxHp));
            }}>
              <input type="number" inputMode="numeric" min="1" max="9999" placeholder="Max HP" aria-label={`Max HP for ${combatant.name}`} value={maxHpDraft} disabled={disabled} onChange={(event) => setMaxHpDraft(event.target.value)} />
              <button type="submit" disabled={disabled || !maxHpDraft}>Set</button>
            </form>}
            <button type="button" disabled={disabled || dead} onClick={() => runMenuAction(() => onAddDamage(5))}>Add 5 damage</button>
            <button type="button" aria-pressed={combatant.revealHp === true} disabled={disabled} onClick={() => runMenuAction(() => patch(game.id, combatant.id, { revealHp: combatant.revealHp !== true }))}>{combatant.revealHp === true ? "Hide HP" : "Show HP"}</button>
            <button type="button" aria-pressed={combatant.revealStats === true} disabled={disabled} onClick={() => runMenuAction(() => patch(game.id, combatant.id, { revealStats: combatant.revealStats !== true }))}>{combatant.revealStats === true ? "Hide stats" : "Show stats"}</button>
            <button type="button" disabled={disabled} onClick={() => runMenuAction(() => resetMonster(game.id, combatant.id))}>Reset stats</button>
          </>}
          {hunterCard && !dead && <button
            className="battle-death-toggle"
            type="button"
            aria-label={`Mark ${combatant.name} dead`}
            disabled={disabled}
            onClick={() => runMenuAction(() => setDeathOpen(true))}
          >Mark dead…</button>}
          <button className="battle-remove" type="button" disabled={disabled} onClick={() => runMenuAction(() => remove(game.id, combatant.id, game, encounterCombatants))}>Remove {combatant.kind === "monster" ? "enemy" : "Hunter"}</button>
        </div>
      </details>
      {/* Portalled: the initiative list is a size container, which would
          otherwise trap this fixed-position dialog inside it. */}
      {deathOpen && hunterCard && createPortal(
        <HunterDeathDialog card={hunterCard} busy={charactersBusy} onConfirm={(spendFavor) => void confirmDeath(spendFavor)} onClose={() => setDeathOpen(false)} />,
        document.body,
      )}
    </div>
  );
}
