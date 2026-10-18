import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, HunterCard } from "@/types";
import { combatVitals } from "../lib/combatPresentation";
import { absorbDamage } from "../lib/tempHp";

/** A battle row's hit points. Hunters are read-only here: players keep their
 * own HP and Temporary HP on their sheet. Enemies are the GM's: Damage
 * (Temporary HP first), Heal, and setting Temporary HP. */
export function useBattleRowHealth({ combatant, characters, game }: {
  combatant: Combatant;
  characters: HunterCard[];
  game: Game;
}) {
  const patch = useCombatStore((state) => state.patch);
  const vitals = combatVitals(combatant, characters);

  /** Set the total damage taken, optionally with the Temporary HP left. */
  function setDamage(damage: number, tempHp?: number) {
    const temp = tempHp !== undefined && tempHp !== vitals.tempHp ? { tempHp } : {};
    if (vitals.maxHp === null) {
      // Unknown max HP: keep a running tally until the DM learns the maximum.
      if (vitals.damageTaken !== null) void patch(game.id, combatant.id, { damageTaken: damage, ...temp });
      return;
    }
    void patch(game.id, combatant.id, { currentHp: vitals.maxHp - damage, defeated: damage >= vitals.maxHp, ...temp });
  }

  function damageBy(amount: number) {
    const { temp, rest } = absorbDamage(vitals.tempHp, amount);
    setDamage((vitals.damageTaken ?? 0) + rest, temp);
  }

  function healBy(amount: number) {
    setDamage(Math.max(0, (vitals.damageTaken ?? 0) - amount));
  }

  /** Temporary HP don't stack: the new amount replaces the old ([page 10]). */
  function setTemp(tempHp: number) {
    void patch(game.id, combatant.id, { tempHp: Math.max(0, tempHp) });
  }

  return { vitals, damageBy, healBy, setTemp };
}
