import { ABILITIES, abilityModifier, formatModifier } from "@/data/abilities";
import { SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { AppPanel, AppSection, AutoReason, type AppSheetModel } from "./appSheetShared";

function SkillList({ result }: { result: ReturnType<typeof useCharacterAutomation>["result"] }) {
  return <div className="appsheet-skill-table">
    {SKILLS.map((skill) => {
      const field = SHEET_SKILL_FIELD[skill.name];
      const proficient = result.fields[`${field}P`] === true;
      return <div key={skill.name} className={proficient ? "proficient" : ""}>
        <span className="appsheet-skill-prof" aria-label={proficient ? "Proficient" : "Not proficient"}>{proficient ? "●" : "○"}</span>
        <span><b>{skill.name}</b><small>{skill.ability.toUpperCase()}</small></span>
        <strong>{result.fields[field]}</strong>
        <AutoReason reason={result.reasons[field]} />
      </div>;
    })}
  </div>;
}

function FinalAbilities({ result }: { result: ReturnType<typeof useCharacterAutomation>["result"] }) {
  return <div className="appsheet-final-abilities">
    {ABILITIES.map((ability) => (
      <div className="appsheet-final-score" key={ability.key}>
        <span>{ability.name}</span><strong>{result.fields[`${ability.key}Score`]}</strong><b>{result.fields[`${ability.key}Mod`]}</b><small>Save {result.fields[`${ability.key}Save`]}</small>
        <AutoReason reason={result.reasons[`${ability.key}Save`]} />
      </div>
    ))}
  </div>;
}

export function AppAbilitiesSection({ model, view = "all", creation = false }: { model: AppSheetModel; view?: "all" | "abilities" | "skills"; creation?: boolean }) {
  const automation = useCharacterAutomation();
  const { result, state, base } = automation;
  const canEditCreationScores = state.setupComplete !== true;

  function canSetBase(score: number) {
    return !model.readOnly && Number.isInteger(score) && score >= 1 && score <= 30;
  }

  return (
    <AppSection id="appsheet-abilities" title={view === "abilities" ? "Abilities" : view === "skills" ? "Skills" : "Abilities & skills"}>
      {view !== "skills" && canEditCreationScores && (
        <AppPanel title="Choose your scores directly">
          <p className="appsheet-ability-intro">Set the scores agreed at your table. The supplied character sheet does not prescribe a score-generation method; modifiers and dependent values update automatically.</p>
          <div className="appsheet-ability-builder">
            {ABILITIES.map((ability) => {
              const score = base[ability.key];
              return (
                <article key={ability.key}>
                  <header><span><b>{ability.short}</b><small>{ability.name}</small></span><em>{formatModifier(abilityModifier(score))} modifier</em></header>
                  <div className="appsheet-ability-controls">
                    <button type="button" aria-label={`Decrease ${ability.name} score`} disabled={!canSetBase(score - 1)} onClick={() => automation.setBase(ability.key, score - 1)}>−</button>
                    <span><output aria-label={`${ability.name} starting score`}>{score}</output><small>Starting score</small></span>
                    <button type="button" aria-label={`Increase ${ability.name} score`} disabled={!canSetBase(score + 1)} onClick={() => automation.setBase(ability.key, score + 1)}>+</button>
                  </div>
                </article>
              );
            })}
          </div>
        </AppPanel>
      )}

      {view === "abilities" && (!creation || !canEditCreationScores) && <FinalAbilities result={result} />}
      {view === "all" && <AppPanel title="Abilities and saves"><FinalAbilities result={result} /></AppPanel>}

      {view === "skills" && <SkillList result={result} />}
      {view === "all" && <AppPanel title="Skills"><SkillList result={result} /></AppPanel>}
    </AppSection>
  );
}
