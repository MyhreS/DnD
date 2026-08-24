import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { DEEPCALLER_WHISPERS, TOOL_PROFICIENCIES } from "@/data/characterOptions";
import { ORIGIN_FEATS } from "@/data/feats";
import { SKILLS } from "@/data/skills";
import { ChoiceToggle } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetSkillChoices } from "./CharacterSheetGuidedChoices";
import { CharacterSheetWeaponMasteryChoices } from "./CharacterSheetWeaponMasteryChoices";

export type UpgradeChoiceKind = "class" | "background" | "class-skills" | "skilled" | "subclass" | "expertise" | "mastery" | "whispers";

export function CharacterSheetUpgradeChoices({ kind, target }: { kind: UpgradeChoiceKind; target: number }) {
  const automation = useCharacterAutomation();
  const { card, klass, background, state } = automation;
  const classSkills = state.classSkills ?? [];
  const expertise = state.expertiseSkills ?? [];
  const whispers = card.preparedWhispers ?? [];

  if (kind === "class") return <div className="character-sheet-upgrade-choice-page"><label className="character-sheet-upgrade-select"><span>Hunter class</span><select value={card.classId} onChange={(event) => automation.chooseClass(event.target.value)}><option value="">Choose...</option>{CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>{klass && <article className="character-sheet-upgrade-detail"><b>{klass.tagline}</b><p>{klass.blurb}</p><small>d{klass.hitDie} hit die · {klass.primaryAbility} · {klass.maxSanity} sanity</small></article>}</div>;

  if (kind === "background") {
    const originFeat = ORIGIN_FEATS.find((feat) => feat.name === background?.feat);
    return <div className="character-sheet-upgrade-choice-page"><label className="character-sheet-upgrade-select"><span>Background</span><select value={card.backgroundId ?? ""} onChange={(event) => automation.chooseBackground(event.target.value)}><option value="">Choose...</option>{BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>{background && <article className="character-sheet-upgrade-detail"><p>{background.text}</p><dl><div><dt>Skills</dt><dd>{background.skills.join(", ")}</dd></div><div><dt>Feat</dt><dd>{background.feat ?? "None"}</dd></div></dl>{originFeat && <p className="character-sheet-upgrade-inline-rule">{originFeat.description}</p>}</article>}</div>;
  }

  if (kind === "class-skills" && klass) return <CharacterSheetSkillChoices kind="class" intro={`Choose ${klass.skillChoices.count} trained skills for ${klass.title}.`} options={klass.skillChoices.options} selected={classSkills} limit={klass.skillChoices.count} onToggle={automation.toggleClassSkill} />;
  if (kind === "skilled") return <ChoiceList intro="Skilled grants any three skill or tool proficiencies." options={[...SKILLS.map((skill) => skill.name), ...TOOL_PROFICIENCIES]} selected={card.featSkills ?? []} limit={3} onToggle={automation.toggleFeatSkill} />;

  if (kind === "subclass" && klass) {
    const selected = klass.subclasses.find((entry) => entry.id === card.subclassId);
    const gainedNow = selected?.features.filter((feature) => feature.level <= target) ?? [];
    const later = selected?.features.filter((feature) => feature.level > target) ?? [];
    return <div className="character-sheet-upgrade-choice-page"><label className="character-sheet-upgrade-select"><span>{klass.name} path</span><small>Selecting a path does not save or advance this page. Review its effects below, then press Next.</small><select value={card.subclassId ?? ""} onChange={(event) => automation.chooseSubclass(event.target.value)}><option value="">Choose...</option>{klass.subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>{selected && <article className="character-sheet-upgrade-detail"><b>{selected.tagline}</b><p>{selected.blurb}</p><div className="character-sheet-upgrade-subclass-features"><SubclassFeatureGroup title="You gain now" features={gainedNow} /><SubclassFeatureGroup title="Later path features" features={later} /></div></article>}</div>;
  }

  if (kind === "expertise") return <CharacterSheetSkillChoices kind="expertise" intro={`Choose ${automation.expertiseLimit} skill${automation.expertiseLimit === 1 ? "" : "s"} for Expertise.`} options={SKILLS.filter((skill) => card.skillProficiencies.includes(skill.name)).map((skill) => skill.name)} selected={expertise} limit={automation.expertiseLimit} onToggle={automation.toggleExpertise} />;
  if (kind === "mastery") return <CharacterSheetWeaponMasteryChoices />;
  if (kind === "whispers") return <div className="character-sheet-upgrade-choice-page"><p>Prepare {automation.whisperLimit} Whispers. Each effect is shown here.</p>{DEEPCALLER_WHISPERS.map((whisper) => <ChoiceToggle key={whisper.id} label={whisper.name} meta={`${whisper.performing} · ${whisper.range} · ${whisper.damage} ${whisper.damageType}`} checked={whispers.includes(whisper.id)} disabled={!whispers.includes(whisper.id) && whispers.length >= automation.whisperLimit} onChange={() => automation.toggleWhisper(whisper.id)} />)}</div>;
  return <p>No choice is required on this step through level {target}.</p>;
}

function SubclassFeatureGroup({ title, features }: { title: string; features: Array<{ level: number; name: string; text: string }> }) {
  if (features.length === 0) return null;
  return <section><h4>{title}</h4>{features.map((feature) => <span key={`${feature.level}:${feature.name}`}><small>Level {feature.level}</small><b>{feature.name}</b><p>{feature.text}</p></span>)}</section>;
}

function ChoiceList({ intro, options, selected, limit, onToggle }: { intro: string; options: readonly string[]; selected: string[]; limit: number; onToggle: (value: string) => void }) {
  return <div className="character-sheet-upgrade-choice-page"><p>{intro} <b>{selected.length} / {limit}</b></p>{options.map((option) => <ChoiceToggle key={option} label={option} checked={selected.includes(option)} disabled={!selected.includes(option) && selected.length >= limit} onChange={() => onToggle(option)} />)}</div>;
}
