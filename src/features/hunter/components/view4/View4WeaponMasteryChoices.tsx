import { WEAPON_FACTS, WEAPON_MASTERY_DESCRIPTIONS, weaponDamageLabel } from "@/data/weapons";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { ChoiceIntro } from "./View4GuidedChoices";

export function View4WeaponMasteryChoices() {
  const automation = useCharacterAutomation();
  const selected = automation.state.weaponMasteries ?? [];
  const complete = selected.length === automation.masteryCount;

  return <div className="v4-upgrade-choice-page">
    <ChoiceIntro
      text={`Choose ${automation.masteryCount} weapons. Mastery unlocks the special effect shown for each one when you attack with it.`}
      help="This does not add the weapon to your gear. Your class lets you retrain mastery choices after a Long Rest."
      count={`${selected.length} / ${automation.masteryCount} chosen`}
      complete={complete}
    />
    <div className="v4-mastery-list">
      {automation.masteryWeapons.map((weapon) => {
        const facts = WEAPON_FACTS[weapon.id];
        const checked = selected.includes(weapon.name);
        const disabled = automation.readOnly || (!checked && selected.length >= automation.masteryCount);
        const mastery = facts?.mastery && facts.mastery !== "—" ? facts.mastery : "DM-set";
        const description = WEAPON_MASTERY_DESCRIPTIONS[mastery]
          ?? "This weapon's statistics and mastery effect are set by the DM.";
        const weaponSummary = facts?.damage === "—"
          ? `DM-set stats · ${facts.attack}`
          : facts ? `${weaponDamageLabel(facts)} · ${facts.attack}` : "Weapon";

        return <label key={weapon.id} className={`v4-mastery-option${checked ? " selected" : ""}`}>
          <input
            type="checkbox"
            aria-label={weapon.name}
            checked={checked}
            disabled={disabled}
            onChange={() => automation.toggleMastery(weapon.name)}
          />
          <span className="v4-mastery-mark" aria-hidden="true" />
          <span className="v4-mastery-copy">
            <span className="v4-mastery-title">
              <b>{weapon.name}</b>
              <small>{weaponSummary}</small>
            </span>
            <span className="v4-mastery-effect"><strong>{mastery}</strong><span>{description}</span></span>
            {facts?.properties && <small className="v4-mastery-properties">{facts.properties}</small>}
          </span>
        </label>;
      })}
    </div>
  </div>;
}
