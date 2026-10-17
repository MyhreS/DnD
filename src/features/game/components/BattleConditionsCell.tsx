import { useMemo, useState } from "react";
import { haptic } from "@/lib/haptics";
import { CONDITIONS, conditionName, customConditionId } from "@/data/conditions";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game } from "@/types";

const CUSTOM = "__custom";

/** Condition chips for one battle row, with a compact add picker for the DM —
 * including a condition the GM names themselves. */
export function BattleConditionsCell({ combatant, game, round, canManage, disabled }: {
  combatant: Combatant;
  game: Game;
  round: number;
  canManage: boolean;
  disabled: boolean;
}) {
  const toggleCondition = useCombatStore((state) => state.toggleCondition);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const available = useMemo(
    () => CONDITIONS.filter((condition) => !combatant.conditions.includes(condition.id)),
    [combatant.conditions],
  );

  function addCustom() {
    const id = customConditionId(customName);
    if (!customName.trim()) return;
    if (!combatant.conditions.includes(id)) void toggleCondition(game.id, combatant, id, round);
    setCustomName("");
    setCustomOpen(false);
  }

  return (
    <div className="battle-conditions">
      <div className="battle-condition-list">
        {combatant.conditions.length === 0 && !canManage && <span className="battle-no-conditions">No conditions</span>}
        {combatant.conditions.map((conditionId) => {
          const since = combatant.conditionSince?.[conditionId];
          const rounds = since ? Math.max(1, round - since + 1) : null;
          const name = conditionName(conditionId);
          const label = <>{name}{rounds && <small>{rounds}r</small>}</>;
          return canManage
            ? <button data-haptic className="battle-condition" key={conditionId} type="button" aria-label={`Remove ${name} from ${combatant.name}`} disabled={disabled} onClick={() => void toggleCondition(game.id, combatant, conditionId, round)}>{label}<span aria-hidden="true">×</span></button>
            : <span className="battle-condition" key={conditionId}>{label}</span>;
        })}
        {canManage && !customOpen && (
          <select className="battle-condition-add" aria-label={`Add condition to ${combatant.name}`} value="" disabled={disabled} onChange={(event) => {
            const value = event.target.value;
            if (!value) return;
            if (value === CUSTOM) { setCustomOpen(true); return; }
            haptic("selection");
            void toggleCondition(game.id, combatant, value, round);
          }}>
            <option value="">+ Condition</option>
            <option value={CUSTOM}>Custom condition…</option>
            {available.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}
          </select>
        )}
        {canManage && customOpen && (
          <form className="battle-condition-custom" onSubmit={(event) => { event.preventDefault(); addCustom(); }}>
            <input autoFocus value={customName} maxLength={40} placeholder="Name the condition" aria-label={`Custom condition for ${combatant.name}`} onChange={(event) => setCustomName(event.target.value)} />
            <button type="submit" data-haptic disabled={!customName.trim()}>Add</button>
            <button type="button" className="is-cancel" aria-label="Cancel custom condition" onClick={() => { setCustomOpen(false); setCustomName(""); }}>×</button>
          </form>
        )}
      </div>
    </div>
  );
}
