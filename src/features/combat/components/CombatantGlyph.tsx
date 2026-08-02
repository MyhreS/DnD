import { CreatureSprite } from "@/data/CreatureSprite";
import { classCreatureId } from "@/data/creatures";
import type { Combatant } from "../types";

export function CombatantGlyph({ combatant, size = 52 }: { combatant: Combatant; size?: number }) {
  const creatureId = combatant.kind === "creature" ? "demon" : classCreatureId(combatant.classId);
  return (
    <div className="combatant-glyph" aria-hidden="true">
      <CreatureSprite id={creatureId} size={size} />
    </div>
  );
}

