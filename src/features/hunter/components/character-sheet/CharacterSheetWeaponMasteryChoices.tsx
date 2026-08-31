import { WEAPON_FACTS, WEAPON_MASTERY_DESCRIPTIONS, weaponDamageLabel, weaponPropertyHelp } from "@/data/weapons";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { ChoiceIntro } from "./CharacterSheetGuidedChoices";

export function CharacterSheetWeaponMasteryChoices() {
  const automation = useCharacterAutomation();
  const selected = automation.state.weaponMasteries ?? [];
  const complete = selected.length === automation.masteryCount;

  return <div className="character-sheet-upgrade-choice-page">
    <ChoiceIntro
      text={`Choose ${automation.masteryCount} weapons. Mastery unlocks the special effect shown for each one when you attack with it.`}
      help="This does not add the weapon to your gear. Your class lets you retrain mastery choices after a Long Rest."
      count={`${selected.length} / ${automation.masteryCount} chosen`}
      complete={complete}
    />
    <div className="character-sheet-mastery-list">
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

        return <label key={weapon.id} className={`character-sheet-mastery-option${checked ? " selected" : ""}`}>
          <input
            type="checkbox"
            aria-label={weapon.name}
            checked={checked}
            disabled={disabled}
            onChange={() => automation.toggleMastery(weapon.name)}
          />
          <span className="character-sheet-mastery-mark" aria-hidden="true" />
          <span className="character-sheet-mastery-copy">
            <span className="character-sheet-mastery-title">
              <b>{weapon.name}</b>
              <small>{weaponSummary}</small>
            </span>
            <span className="character-sheet-mastery-effect"><strong>{mastery}</strong><span>{description}</span></span>
            {facts?.properties && <small className="character-sheet-mastery-properties" title={weaponPropertyHelp(facts.properties)}>{facts.properties}</small>}
          </span>
        </label>;
      })}
    </div>
  </div>;
}
