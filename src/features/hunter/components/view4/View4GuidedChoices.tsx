import { ABILITIES, ABILITY_NAME, MADUHAUSU_FINAL_MAX, abilityModifier, formatModifier } from "@/data/abilities";
import { SKILL_BY_NAME } from "@/data/skills";
import { proficiencyBonus } from "@/lib/character";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

export function View4BackgroundAbilities() {
  const automation = useCharacterAutomation();
  const { background, base, bonuses, bonusUsed, klass, mode } = automation;
  if (!background) return null;

  return <div className="v4-upgrade-choice-page">
    <ChoiceIntro
      text="Place +2 and +1 on different abilities, or +1 on all three. Your final scores update here as you choose."
      help="An ability modifier changes on every even score. Class focus marks an ability your class relies on most."
      count={`${bonusUsed} / 3 points`}
      complete={bonusUsed === 3}
    />
    <div className="v4-guided-ability-list">
      {background.abilityScores.map((key) => {
        const ability = ABILITIES.find((entry) => entry.key === key)!;
        const amount = bonuses[key] ?? 0;
        const finalScore = base[key] + amount;
        const beforeModifier = abilityModifier(base[key]);
        const afterModifier = abilityModifier(finalScore);
        const otherPoints = bonusUsed - amount;
        const maximum = mode === "maduhausu" ? MADUHAUSU_FINAL_MAX : 20;
        const classFocus = klass?.primaryAbility.split(/\W+/).includes(ability.short) ?? false;
        const impact = amount === 0
          ? `Currently ${formatModifier(beforeModifier)} modifier.`
          : afterModifier > beforeModifier
            ? `Modifier improves from ${formatModifier(beforeModifier)} to ${formatModifier(afterModifier)}.`
            : `Score rises; modifier stays ${formatModifier(afterModifier)} until the next even score.`;

        return <article key={key} className={`v4-guided-ability${amount > 0 ? " selected" : ""}`}>
          <header>
            <span><b>{ability.name}</b><small>{ability.description}</small></span>
            <strong>{base[key]} <i>to</i> {finalScore}</strong>
          </header>
          <div className="v4-background-bonus-buttons" role="group" aria-label={`${ABILITY_NAME[key]} background bonus`}>
            {[0, 1, 2].map((value) => <button
              key={value}
              type="button"
              aria-label={`${ABILITY_NAME[key]} background bonus +${value}`}
              aria-pressed={amount === value}
              disabled={amount !== value && (otherPoints + value > 3 || base[key] + value > maximum)}
              onClick={() => automation.setBonus(key, value)}
            >{value === 0 ? "None" : `+${value}`}</button>)}
          </div>
          <footer><span>{impact}</span>{classFocus && <em>Class focus</em>}</footer>
        </article>;
      })}
    </div>
  </div>;
}

export function View4SkillChoices({
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

  return <div className="v4-upgrade-choice-page">
    <ChoiceIntro text={intro} help={help} count={`${eligibleSelected.length} / ${limit} chosen`} complete={eligibleSelected.length === limit} />
    <div className="v4-guided-skill-list">
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

        return <label key={skill.name} className={`v4-guided-skill${checked ? " selected" : ""}${backgroundSkill ? " from-background" : ""}`}>
          <input type="checkbox" aria-label={skill.name} checked={checked} disabled={disabled} onChange={() => onToggle(skill.name)} />
          <span className="v4-guided-skill-mark" aria-hidden="true" />
          <span className="v4-guided-skill-copy">
            <span className="v4-guided-skill-title"><b>{skill.name}</b><small>{ABILITY_NAME[skill.ability]}</small></span>
            <span>{skill.description}</span>
            <span className="v4-guided-skill-facts"><strong>{score}</strong>{!backgroundSkill && baseCheck === highestModifier && <em>Uses a high score</em>}{backgroundSkill && <em>From {background?.name}</em>}</span>
          </span>
        </label>;
      })}
    </div>
  </div>;
}

function ChoiceIntro({ text, help, count, complete }: { text: string; help: string; count: string; complete: boolean }) {
  return <header className="v4-guided-choice-intro">
    <span><p>{text}</p><small>{help}</small></span>
    <strong className={complete ? "complete" : ""}>{count}</strong>
  </header>;
}
