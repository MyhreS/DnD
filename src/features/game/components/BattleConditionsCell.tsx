import { useMemo } from "react";
import { haptic } from "@/lib/haptics";
import { CONDITIONS, CONDITION_NAME } from "@/data/conditions";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game } from "@/types";

/** Condition chips for one battle row, with a compact add picker for the DM. */
export function BattleConditionsCell({ combatant, game, round, canManage, disabled }: {
  combatant: Combatant;
  game: Game;
  round: number;
  canManage: boolean;
  disabled: boolean;
}) {
  const toggleCondition = useCombatStore((state) => state.toggleCondition);
  const available = useMemo(
    () => CONDITIONS.filter((condition) => !combatant.conditions.includes(condition.id)),
    [combatant.conditions],
  );

  return (
    <div className="battle-conditions">
      <div className="battle-condition-list">
        {combatant.conditions.length === 0 && !canManage && <span className="battle-no-conditions">No conditions</span>}
        {combatant.conditions.map((conditionId) => {
          const since = combatant.conditionSince?.[conditionId];
          const rounds = since ? Math.max(1, round - since + 1) : null;
          const name = CONDITION_NAME[conditionId] ?? conditionId;
          const label = <>{name}{rounds && <small>{rounds}r</small>}</>;
          return canManage
            ? <button className="battle-condition" key={conditionId} type="button" aria-label={`Remove ${name} from ${combatant.name}`} disabled={disabled} onClick={() => void toggleCondition(game.id, combatant, conditionId, round)}>{label}<span aria-hidden="true">×</span></button>
            : <span className="battle-condition" key={conditionId}>{label}</span>;
        })}
        {canManage && (
          <select className="battle-condition-add" aria-label={`Add condition to ${combatant.name}`} value="" disabled={disabled || available.length === 0} onChange={(event) => { if (event.target.value) haptic("selection"); if (event.target.value) void toggleCondition(game.id, combatant, event.target.value, round); }}>
            <option value="">+ Condition</option>
            {available.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
