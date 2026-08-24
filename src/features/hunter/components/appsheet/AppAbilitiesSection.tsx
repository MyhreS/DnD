import { ABILITIES, MADUHAUSU_MAX, MADUHAUSU_MIN, POINT_BUY_MAX, POINT_BUY_MIN, abilityModifier, formatModifier } from "@/data/abilities";
import { SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { budgetFor, spentFor, type BuyMode } from "../../lib/abilityBuy";
import { AppPanel, AppSection, AutoReason, type AppSheetModel } from "./appSheetShared";

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

export function AppAbilitiesSection({ model, view = "all", creation = false }: { model: AppSheetModel; view?: "all" | "abilities" | "skills"; creation?: boolean }) {
  const automation = useCharacterAutomation();
  const { result, state, background, base, pointsLeft } = automation;
  const canEditCreationScores = state.setupComplete !== true;
  const budget = budgetFor(automation.mode);
  const pointsSpent = pointsLeft == null ? null : budget - pointsLeft;
  const min = automation.mode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
  const max = automation.mode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;

  function canSetBase(key: (typeof ABILITIES)[number]["key"], score: number) {
    if (model.readOnly || score < min || score > max) return false;
    const nextSpent = spentFor(automation.mode, { ...base, [key]: score });
    return nextSpent != null && nextSpent <= budget;
  }

  return (
    <AppSection id="appsheet-abilities" title={view === "abilities" ? "Abilities" : view === "skills" ? "Skills" : "Abilities & skills"}>
      {view !== "skills" && canEditCreationScores && (
        <AppPanel title="Choose your scores">
          <p className="appsheet-ability-intro">Set each base score with + or −. Higher scores use more points.{creation && " You will add your background bonuses next."}</p>
          <div className="appsheet-ability-method" role="group" aria-label="Ability method">
            {(["pointbuy", "maduhausu"] as BuyMode[]).map((mode) => (
              <button key={mode} type="button" aria-pressed={automation.mode === mode} disabled={model.readOnly} onClick={() => automation.switchMode(mode)}>
                <span>{mode === "pointbuy" ? "Standard" : "Maduhausu"}</span>
                <small>{budgetFor(mode)} points</small>
              </button>
            ))}
          </div>
          <div className={pointsLeft === 0 ? "appsheet-ability-budget is-complete" : "appsheet-ability-budget"} aria-live="polite">
            <span><strong>{pointsLeft ?? "—"} points left</strong><small>{pointsLeft === 0 ? "Ready to continue" : pointsLeft == null ? "Choose valid scores" : `Spend all ${budget} points to continue`}</small></span>
            <div role="progressbar" aria-label={pointsSpent == null ? "Invalid point budget" : `${pointsSpent} of ${budget} points spent`} aria-valuemin={0} aria-valuemax={budget} aria-valuenow={pointsSpent ?? undefined}>
              <i style={{ width: `${pointsSpent == null ? 0 : pointsSpent / budget * 100}%` }} />
            </div>
          </div>
          <div className="appsheet-ability-builder">
            {ABILITIES.map((ability) => {
              const score = base[ability.key];
              return (
                <article key={ability.key}>
                  <header><span><b>{ability.short}</b><small>{ability.name}</small></span><em>{formatModifier(abilityModifier(score))} modifier</em></header>
                  <div className="appsheet-ability-controls">
                    <button type="button" aria-label={`Decrease ${ability.name} score`} disabled={!canSetBase(ability.key, score - 1)} onClick={() => automation.setBase(ability.key, score - 1)}>−</button>
                    <span><output aria-label={`${ability.name} base score`}>{score}</output><small>Base score</small></span>
                    <button type="button" aria-label={`Increase ${ability.name} score`} disabled={!canSetBase(ability.key, score + 1)} onClick={() => automation.setBase(ability.key, score + 1)}>+</button>
                  </div>
                </article>
              );
            })}
          </div>
          {!creation && <AutoReason reason={background ? `${background.name} allows bonuses to ${background.abilityScores.map((key) => key.toUpperCase()).join(", ")}; assign them in Upgrade.` : "Choose a background in Hunter & build, then assign its ability bonuses in Upgrade."} />}
        </AppPanel>
      )}

      {view === "abilities" && (!creation || !canEditCreationScores) && <FinalAbilities result={result} />}
      {view === "all" && <AppPanel title="Final abilities and saves"><FinalAbilities result={result} /></AppPanel>}

      {view === "skills" && <SkillList result={result} />}
      {view === "all" && <AppPanel title="Skills"><SkillList result={result} /></AppPanel>}
    </AppSection>
  );
}
