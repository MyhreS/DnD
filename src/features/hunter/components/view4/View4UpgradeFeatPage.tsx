import { ABILITIES } from "@/data/abilities";
import type { AbilityKey, SheetAutomationState } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { featOptionsFor, type UpgradeFeature } from "./upgradeModel";

export function View4UpgradeFeatPage({ feature, state }: { feature: UpgradeFeature; state: SheetAutomationState }) {
  const automation = useCharacterAutomation();
  const options = featOptionsFor(feature);
  const selected = options.find((feat) => feat.name === state.levelFeats?.[feature.key]);
  const bonuses = state.levelAbilityBonuses?.[feature.key] ?? {};
  const used = Object.values(bonuses).reduce((sum, value) => sum + (value ?? 0), 0);

  function setAbility(key: AbilityKey, value: number) {
    if (!selected) return;
    const next = { ...bonuses, [key]: value };
    if (Object.values(next).reduce((sum, amount) => sum + (amount ?? 0), 0) > selected.abilityPoints) return;
    if (automation.card.abilities[key] - (bonuses[key] ?? 0) + value > selected.abilityMaximum) return;
    automation.setUpgradeFeat(feature.key, selected.name, next);
  }

  return <div className="v4-upgrade-feature-page">
    <p className="v4-upgrade-feature-text">{feature.text}</p>
    {options.length > 0 ? <>
      <label className="v4-upgrade-select"><span>Choose feat</span><select value={selected?.name ?? ""} disabled={automation.readOnly} onChange={(event) => automation.setUpgradeFeat(feature.key, event.target.value, {})}><option value="">Choose...</option>{options.map((feat) => <option key={feat.id} value={feat.name}>{feat.name}</option>)}</select></label>
      {selected && <article className="v4-upgrade-feat-detail">
        <header><b>{selected.name}</b><small>{selected.category}{selected.prerequisite && ` · ${selected.prerequisite}`}</small></header>
        <p>{selected.description}</p>
        {selected.abilityPoints > 0 && <div className="v4-upgrade-feat-abilities">
          <span>Place {selected.abilityPoints} point{selected.abilityPoints === 1 ? "" : "s"} <small>{used} / {selected.abilityPoints}</small></span>
          <div>{ABILITIES.filter((ability) => selected.abilityOptions.includes(ability.key)).map((ability) => {
            const amount = bonuses[ability.key] ?? 0;
            const before = automation.card.abilities[ability.key] - amount;
            return <label key={ability.key}><span>{ability.short}<small>{before} → {before + amount}</small></span><select aria-label={`${ability.name} feat increase`} value={amount} onChange={(event) => setAbility(ability.key, Number(event.target.value))}><option value="0">+0</option><option value="1">+1</option>{selected.abilityPoints > 1 && <option value="2">+2</option>}</select></label>;
          })}</div>
        </div>}
      </article>}
    </> : feature.choice ? <label className="v4-upgrade-record"><span><b>Record your choice</b><small>This rule has no finite option list in the source material.</small></span><input value={state.levelChoices?.[feature.key] ?? ""} disabled={automation.readOnly} placeholder="Your choice" onChange={(event) => automation.setLevelChoice(feature.key, event.target.value)} /></label> : null}
  </div>;
}
