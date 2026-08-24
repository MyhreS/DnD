import { ABILITY_NAME, abilityModifier, formatModifier } from "@/data/abilities";
import { SKILL_BY_NAME } from "@/data/skills";
import { proficiencyBonus } from "@/lib/character";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

export function CharacterSheetSkillChoices({
  kind,
  intro,
  options,
  selected,
  limit,
  onToggle,
}: {
  kind: "class" | "expertise";
  intro: string;
  options: readonly string[];
  selected: string[];
  limit: number;
  onToggle: (value: string) => void;
}) {
  const { background, card } = useCharacterAutomation();
  const proficiency = proficiencyBonus(card.level);
  const eligibleSelected = kind === "class"
    ? selected.filter((name) => !background?.skills.includes(name))
    : selected;
  const available = options.map((name) => SKILL_BY_NAME[name]).filter(Boolean);
  const highestModifier = Math.max(...available.map((skill) => abilityModifier(card.abilities[skill.ability])));
  const help = kind === "expertise"
    ? `Expertise adds your +${proficiency} proficiency bonus a second time. Choose the trained skills you most want to rely on.`
    : `Training adds your +${proficiency} proficiency bonus. Choose actions that suit how you want this hunter to solve problems.`;

  return <div className="character-sheet-upgrade-choice-page">
    <ChoiceIntro text={intro} help={help} count={`${eligibleSelected.length} / ${limit} chosen`} complete={eligibleSelected.length === limit} />
    <div className="character-sheet-guided-skill-list">
      {available.map((skill) => {
        const checked = selected.includes(skill.name);
        const backgroundSkill = kind === "class" && (background?.skills.includes(skill.name) ?? false);
        const baseCheck = abilityModifier(card.abilities[skill.ability]);
        const trainedCheck = baseCheck + proficiency;
        const expertCheck = trainedCheck + proficiency;
        const disabled = !checked && (eligibleSelected.length >= limit || backgroundSkill);
        const score = kind === "expertise"
          ? `${formatModifier(trainedCheck)} trained to ${formatModifier(expertCheck)} expert`
          : backgroundSkill
            ? `${formatModifier(trainedCheck)} already trained`
            : checked
              ? `${formatModifier(trainedCheck)} trained`
              : `${formatModifier(baseCheck)} now; ${formatModifier(trainedCheck)} trained`;

        return <label key={skill.name} className={`character-sheet-guided-skill${checked ? " selected" : ""}${backgroundSkill ? " from-background" : ""}`}>
          <input type="checkbox" aria-label={skill.name} checked={checked} disabled={disabled} onChange={() => onToggle(skill.name)} />
          <span className="character-sheet-guided-skill-mark" aria-hidden="true" />
          <span className="character-sheet-guided-skill-copy">
            <span className="character-sheet-guided-skill-title"><b>{skill.name}</b><small>{ABILITY_NAME[skill.ability]}</small></span>
            <span>{skill.description}</span>
            <span className="character-sheet-guided-skill-facts"><strong>{score}</strong>{!backgroundSkill && baseCheck === highestModifier && <em>Uses a high score</em>}{backgroundSkill && <em>From {background?.name}</em>}</span>
          </span>
        </label>;
      })}
    </div>
  </div>;
}

export function ChoiceIntro({ text, help, count, complete }: { text: string; help: string; count: string; complete: boolean }) {
  return <header className="character-sheet-guided-choice-intro">
    <span><p>{text}</p><small>{help}</small></span>
    <strong className={complete ? "complete" : ""}>{count}</strong>
  </header>;
}
