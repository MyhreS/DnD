import { ABILITIES, MADUHAUSU_MAX, MADUHAUSU_MIN, POINT_BUY_MAX, POINT_BUY_MIN } from "@/data/abilities";
import { TOOL_PROFICIENCIES } from "@/data/characterOptions";
import { SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import type { BuyMode } from "../../lib/abilityBuy";
import {
  AppPanel,
  AppSection,
  AppSelect,
  AutoReason,
  ChoiceToggle,
  DerivedValue,
  PendingNotice,
  type AppSheetModel,
} from "./appSheetShared";

export function AppAbilitiesSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, result, state, klass, background, base, bonuses, pointsLeft, bonusUsed } = automation;
  const setupComplete = state.setupComplete === true;
  const classChoices = state.classSkills ?? [];
  const featChoices = card.featSkills ?? [];
  const classRemaining = Math.max(0, (klass?.skillChoices.count ?? 0) - classChoices.length);
  const featRemaining = background?.feat === "Skilled" ? Math.max(0, 3 - featChoices.length) : 0;
  const ready = !!card.classId
    && !!card.backgroundId
    && pointsLeft === 0
    && bonusUsed === 3
    && classRemaining === 0
    && featRemaining === 0;

  return (
    <AppSection
      eyebrow="Rules engine"
      title="Abilities & skills"
      intro="Choose the inputs. Modifiers, saves, proficiencies, and skill bonuses are produced from those choices."
    >
      {!setupComplete && (
        <AppPanel title="Build ability scores" aside={<span className={pointsLeft === 0 ? "appsheet-complete" : "appsheet-incomplete"}>{pointsLeft ?? "Invalid"} points left</span>}>
          <AppSelect label="Ability method" value={automation.mode} disabled={model.readOnly} onChange={(event) => automation.switchMode(event.target.value as BuyMode)}>
            <option value="pointbuy">Standard point buy · 27 points</option>
            <option value="maduhausu">Maduhausu · 57 points</option>
          </AppSelect>
          <div className="appsheet-ability-builder">
            {ABILITIES.map((ability) => {
              const min = automation.mode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
              const max = automation.mode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;
              const eligible = background?.abilityScores.includes(ability.key) ?? false;
              return (
                <div key={ability.key}>
                  <span className="appsheet-ability-name"><b>{ability.short}</b>{ability.name}</span>
                  <AppSelect label="Base" aria-label={`${ability.name} app base`} value={base[ability.key]} disabled={model.readOnly} onChange={(event) => automation.setBase(ability.key, Number(event.target.value))}>
                    {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => <option key={score}>{score}</option>)}
                  </AppSelect>
                  <AppSelect label="Background" aria-label={`${ability.name} app background bonus`} value={bonuses[ability.key] ?? 0} disabled={model.readOnly || !eligible} onChange={(event) => automation.setBonus(ability.key, Number(event.target.value))}>
                    <option value="0">+0</option><option value="1">+1</option><option value="2">+2</option>
                  </AppSelect>
                  <output>{card.abilities[ability.key]}</output>
                </div>
              );
            })}
          </div>
          <AutoReason reason={background ? `${background.name} allows bonuses to ${background.abilityScores.map((key) => key.toUpperCase()).join(", ")}; exactly 3 bonus points are required.` : "Choose a background to reveal which abilities can receive its 3 bonus points."} />
        </AppPanel>
      )}

      {klass ? (
        <AppPanel title={`${klass.title} skill choices`} aside={<span className={classRemaining ? "appsheet-incomplete" : "appsheet-complete"}>{classRemaining} left</span>}>
          <div className="appsheet-choice-list">
            {klass.skillChoices.options.map((skill) => (
              <ChoiceToggle key={skill} label={skill} checked={classChoices.includes(skill)} disabled={model.readOnly} onChange={() => automation.toggleClassSkill(skill)} />
            ))}
          </div>
          <AutoReason reason={`${klass.title} grants ${klass.skillChoices.count} class skill proficiencies. Background skills are added separately.`} />
        </AppPanel>
      ) : (
        <PendingNotice><b>Choose a class on Overview</b><p>Your available class skills depend on that choice.</p></PendingNotice>
      )}

      {background?.feat === "Skilled" && (
        <AppPanel title="Skilled feat choices" aside={<span className={featRemaining ? "appsheet-incomplete" : "appsheet-complete"}>{featRemaining} left</span>}>
          <div className="appsheet-choice-list compact">
            {[...SKILLS.map((skill) => skill.name), ...TOOL_PROFICIENCIES].map((choice) => (
              <ChoiceToggle key={choice} label={choice} checked={featChoices.includes(choice)} disabled={model.readOnly} onChange={() => automation.toggleFeatSkill(choice)} />
            ))}
          </div>
          <AutoReason reason="The Skilled background feat grants any combination of three skills or tool proficiencies." />
        </AppPanel>
      )}

      <AppPanel title="Final abilities and saves">
        <div className="appsheet-final-abilities">
          {ABILITIES.map((ability) => (
            <div key={ability.key}>
              <div className="appsheet-final-score">
                <span>{ability.name}</span><strong>{result.fields[`${ability.key}Score`]}</strong><b>{result.fields[`${ability.key}Mod`]}</b>
              </div>
              <DerivedValue label="Saving throw" value={result.fields[`${ability.key}Save`]} reason={result.reasons[`${ability.key}Save`]} />
            </div>
          ))}
        </div>
      </AppPanel>

      <AppPanel title="Skill bonuses" aside={<span className="appsheet-status-word">Calculated</span>}>
        <div className="appsheet-skill-table">
          {SKILLS.map((skill) => {
            const field = SHEET_SKILL_FIELD[skill.name];
            const proficient = result.fields[`${field}P`] === true;
            return (
              <div key={skill.name} className={proficient ? "proficient" : ""}>
                <span className="appsheet-skill-prof" aria-label={proficient ? "Proficient" : "Not proficient"}>{proficient ? "●" : "○"}</span>
                <span><b>{skill.name}</b><small>{skill.ability.toUpperCase()}</small></span>
                <strong>{result.fields[field]}</strong>
                <AutoReason reason={result.reasons[field]} />
              </div>
            );
          })}
        </div>
      </AppPanel>

      {!setupComplete && !model.readOnly && (
        <div className="appsheet-finish-bar">
          <div><b>{ready ? "Character decisions complete" : "Finish the remaining decisions"}</b><span>Lock creation scores when you are ready. Level-up choices remain available later.</span></div>
          <button type="button" disabled={!ready} onClick={automation.finishSetup}>Finish setup</button>
        </div>
      )}
    </AppSection>
  );
}
