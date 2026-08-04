import { WHISPERS } from "@/data/characterOptions";
import { SKILLS } from "@/data/skills";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import {
  AppPanel,
  AppSection,
  AutoReason,
  ChoiceToggle,
  DerivedValue,
  PendingNotice,
  type AppSheetModel,
} from "./appSheetShared";

export function AppFeaturesSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, klass, result, state, expertiseLimit, masteryCount, masteryWeapons, whisperLimit } = automation;
  const subclass = klass?.subclasses.find((entry) => entry.id === card.subclassId);
  const expertise = state.expertiseSkills ?? [];
  const masteries = state.weaponMasteries ?? [];
  const whispers = card.preparedWhispers ?? [];
  const proficientSkills = SKILLS.filter((skill) => card.skillProficiencies.includes(skill.name));
  const classFeatures = klass?.features?.filter((feature) => feature.level <= card.level) ?? [];
  const subclassFeatures = subclass?.features.filter((feature) => feature.level <= card.level) ?? [];
  const currentProgression = klass?.progression.find((row) => row.level === card.level);
  const pending = Object.values(result.pending).filter(Boolean);

  return (
    <AppSection title="Features & choices">
      {!klass && <PendingNotice><b>Choose a class on Overview</b><p>Class features and level choices will appear here automatically.</p></PendingNotice>}

      {klass && (
        <div className="appsheet-feature-hero">
          <div><span>{klass.title} · level {card.level}</span><h3>{(klass.signature ?? klass.tagline).split("—")[0].trim()}</h3><p>{klass.signature ?? klass.tagline}</p></div>
          <div>
            {Object.entries(currentProgression?.extras ?? {}).map(([label, value]) => <DerivedValue key={label} label={label} value={value} reason={`${klass.title} level ${card.level} progression table`} />)}
          </div>
        </div>
      )}

      {expertiseLimit > 0 && (
        <AppPanel title="Expertise" aside={<span className={expertise.length === expertiseLimit ? "appsheet-complete" : "appsheet-incomplete"}>{expertise.length}/{expertiseLimit}</span>}>
          <div className="appsheet-choice-list">
            {proficientSkills.map((skill) => <ChoiceToggle key={skill.name} label={skill.name} checked={expertise.includes(skill.name)} disabled={model.readOnly || (!expertise.includes(skill.name) && expertise.length >= expertiseLimit)} onChange={() => automation.toggleExpertise(skill.name)} />)}
          </div>
          <AutoReason reason={`${klass?.title} progression grants Expertise in ${expertiseLimit} proficient ${expertiseLimit === 1 ? "skill" : "skills"} at this level.`} />
        </AppPanel>
      )}

      {masteryCount > 0 && (
        <AppPanel title="Weapon mastery" aside={<span className={masteries.length === masteryCount ? "appsheet-complete" : "appsheet-incomplete"}>{masteries.length}/{masteryCount}</span>}>
          <div className="appsheet-choice-list compact">
            {masteryWeapons.map((weapon) => <ChoiceToggle key={weapon.id} label={weapon.name} meta={weapon.carry} checked={masteries.includes(weapon.name)} disabled={model.readOnly || (!masteries.includes(weapon.name) && masteries.length >= masteryCount)} onChange={() => automation.toggleMastery(weapon.name)} />)}
          </div>
          <AutoReason reason={`${klass?.title} allows ${masteryCount} eligible weapon ${masteryCount === 1 ? "mastery" : "masteries"} at level ${card.level}.`} />
        </AppPanel>
      )}

      {whisperLimit > 0 && (
        <AppPanel title="Prepared Whispers" aside={<span className={whispers.length === whisperLimit ? "appsheet-complete" : "appsheet-incomplete"}>{whispers.length}/{whisperLimit}</span>}>
          <div className="appsheet-choice-list">
            {WHISPERS.map((whisper) => <ChoiceToggle key={whisper.id} label={whisper.name} checked={whispers.includes(whisper.id)} disabled={model.readOnly || (!whispers.includes(whisper.id) && whispers.length >= whisperLimit)} onChange={() => automation.toggleWhisper(whisper.id)} />)}
          </div>
          <AutoReason reason={klass?.caster ? `${klass.title} progression and the Listener feat determine how many Whispers may be prepared.` : "The Listener feat grants one Whisper of your choice."} />
        </AppPanel>
      )}

      {pending.length > 0 && (
        <AppPanel title="Decisions still required" aside={<span className="appsheet-incomplete">{pending.length}</span>}>
          <div className="appsheet-pending-list">
            {pending.map((choice) => choice && <div key={choice.label}><span><b>{choice.label}</b><small>{choice.reason}</small></span><strong>{choice.remaining} left</strong></div>)}
          </div>
          <AutoReason reason="Only decisions with finite, verified options are shown as selectors. Creation choices continue under Abilities & skills; subclass selection is under Overview." />
        </AppPanel>
      )}

      {klass && (
        <AppPanel title="Unlocked class features" aside={<span className="appsheet-status-word">Through level {card.level}</span>}>
          <div className="appsheet-feature-timeline">
            {[...classFeatures, ...subclassFeatures].sort((a, b) => a.level - b.level).map((feature, index) => (
              <details key={`${feature.level}-${feature.name}-${index}`} open={feature.level === card.level}>
                <summary><span>Level {feature.level}</span><b>{feature.name}</b>{subclassFeatures.includes(feature) && <em>{subclass?.name}</em>}</summary>
                <p>{feature.text}</p>
              </details>
            ))}
          </div>
          <AutoReason reason={`${klass.title}${subclass ? ` and ${subclass.name}` : ""} feature text from the class boards and Player's Handbook.`} />
        </AppPanel>
      )}

      <div className="appsheet-two-column">
        <AppPanel title="Feats">
          <div className="appsheet-token-list">{[card.feat, ...(card.feats ?? [])].filter(Boolean).map((feat) => <span key={feat}>{feat}</span>)}</div>
          {!card.feat && !(card.feats?.length) && <p className="appsheet-empty-copy">No feat is currently granted.</p>}
          <AutoReason reason={result.reasons.feats} />
        </AppPanel>
        <AppPanel title="Tools">
          <p className="appsheet-large-readout">{String(result.fields.tools || "No tool proficiency")}</p>
          <AutoReason reason={result.reasons.tools} />
        </AppPanel>
      </div>
    </AppSection>
  );
}
