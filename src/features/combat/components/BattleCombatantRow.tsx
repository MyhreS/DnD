import type { Combatant } from "../types";
import { CombatantGlyph } from "./CombatantGlyph";

export function BattleCombatantRow({ combatant, active, position }: { combatant: Combatant; active: boolean; position: number }) {
  const damage =
    combatant.maxHp !== null && combatant.currentHp !== null
      ? Math.max(0, combatant.maxHp - combatant.currentHp)
      : null;
  const defeated = combatant.currentHp === 0;

  return (
    <li className={`battle-combatant${active ? " is-active" : ""}${defeated ? " is-defeated" : ""}`} data-testid={`battle-${combatant.name}`}>
      <span className="battle-position">{position}</span>
      <CombatantGlyph combatant={combatant} size={72} />
      <div className="battle-identity">
        <h2>{combatant.name}</h2>
        <span>Initiative {combatant.initiative ?? "-"}</span>
      </div>
      <dl className="battle-vitals">
        <div>
          <dt>Damage</dt>
          <dd>{damage ?? "-"}</dd>
        </div>
        <div>
          <dt>AC</dt>
          <dd>{combatant.armorClass ?? "-"}</dd>
        </div>
      </dl>
      <div className="battle-conditions">
        {defeated ? <strong>DOWN</strong> : combatant.conditions.length ? combatant.conditions.join(" · ") : "No conditions"}
      </div>
    </li>
  );
}

