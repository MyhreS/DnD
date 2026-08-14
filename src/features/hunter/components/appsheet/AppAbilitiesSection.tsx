import { ABILITIES, MADUHAUSU_MAX, MADUHAUSU_MIN, POINT_BUY_MAX, POINT_BUY_MIN } from "@/data/abilities";
import { SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import type { BuyMode } from "../../lib/abilityBuy";
import { AppPanel, AppSection, AppSelect, AutoReason, type AppSheetModel } from "./appSheetShared";

function SkillList({ result }: { result: ReturnType<typeof useCharacterAutomation>["result"] }) {
  return <div className="appsheet-skill-table">
    {SKILLS.map((skill) => {
      const field = SHEET_SKILL_FIELD[skill.name];
      const proficient = result.fields[`${field}P`] === true;
      return <div key={skill.name} className={proficient ? "proficient" : ""}><span className="appsheet-skill-prof" aria-label={proficient ? "Proficient" : "Not proficient"}>{proficient ? "●" : "○"}</span><span><b>{skill.name}</b><small>{skill.ability.toUpperCase()}</small></span><strong>{result.fields[field]}</strong><AutoReason reason={result.reasons[field]} /></div>;
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

export function AppAbilitiesSection({ model, view = "all" }: { model: AppSheetModel; view?: "all" | "abilities" | "skills" }) {
  const automation = useCharacterAutomation();
  const { card, result, state, background, base, bonuses, pointsLeft } = automation;
  const canEditCreationScores = state.setupComplete !== true || card.level === 1;

  return (
    <AppSection id="appsheet-abilities" title={view === "abilities" ? "Abilities" : view === "skills" ? "Skills" : "Abilities & skills"}>
      {view !== "skills" && canEditCreationScores && (
        <AppPanel title="Build ability scores" aside={<span className={pointsLeft === 0 ? "appsheet-complete" : "appsheet-incomplete"}>{pointsLeft ?? "Invalid"} points left</span>}>
          <AppSelect label="Ability method" value={automation.mode} disabled={model.readOnly} onChange={(event) => automation.switchMode(event.target.value as BuyMode)}>
            <option value="pointbuy">Standard point buy · 27 points</option>
            <option value="maduhausu">Maduhausu · 57 points</option>
          </AppSelect>
          <div className="appsheet-ability-builder">
            {ABILITIES.map((ability) => {
              const min = automation.mode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
              const max = automation.mode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;
              return (
                <div key={ability.key}>
                  <span className="appsheet-ability-name"><b>{ability.short}</b>{ability.name}</span>
                  <AppSelect label="Base" aria-label={`${ability.name} app base`} value={base[ability.key]} disabled={model.readOnly} onChange={(event) => automation.setBase(ability.key, Number(event.target.value))}>
                    {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => <option key={score}>{score}</option>)}
                  </AppSelect>
                  <span className="appsheet-ability-background">Background +{bonuses[ability.key] ?? 0}</span>
                  <output>{card.abilities[ability.key]}</output>
                </div>
              );
            })}
          </div>
          <AutoReason reason={background ? `${background.name} allows bonuses to ${background.abilityScores.map((key) => key.toUpperCase()).join(", ")}; assign them in Upgrade.` : "Choose a background in Hunter & build, then assign its ability bonuses in Upgrade."} />
        </AppPanel>
      )}

      {view === "abilities" && <FinalAbilities result={result} />}
      {view === "all" && <AppPanel title="Final abilities and saves"><FinalAbilities result={result} /></AppPanel>}

      {view === "skills" && <SkillList result={result} />}
      {view === "all" && <AppPanel title="Skills"><SkillList result={result} /></AppPanel>}
    </AppSection>
  );
}
