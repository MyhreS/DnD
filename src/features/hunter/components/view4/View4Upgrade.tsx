import { ABILITY_NAME } from "@/data/abilities";
import { WHISPERS, TOOL_PROFICIENCIES } from "@/data/characterOptions";
import { SKILLS } from "@/data/skills";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { ChoiceToggle } from "../appsheet/appSheetShared";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { earnedLevel, recordedUpgradeChoices, upgradeFeatures } from "./upgradeModel";

function valueOf(value: unknown): string {
  return String(value ?? "\u2014");
}

export function View4Upgrade({ model, onComplete, onOpenHunter }: { model: AppSheetModel; onComplete: () => void; onOpenHunter: () => void }) {
  const stage = useAppEditStage();
  const automation = useCharacterAutomation();
  const { card, klass, result, state, expertiseLimit, masteryCount, masteryWeapons, whisperLimit } = automation;
  const saved = stage.savedCard;
  const target = earnedLevel(card);
  const startLevel = Math.min(saved.level, saved.lastSeenLevel ?? saved.level);
  const features = upgradeFeatures(klass, card.subclassId, startLevel, target);
  const recordedChoices = recordedUpgradeChoices(klass, { ...card, level: saved.level, lastSeenLevel: saved.lastSeenLevel }, target);
  const classSkills = state.classSkills ?? [];
  const featSkills = card.featSkills ?? [];
  const expertise = state.expertiseSkills ?? [];
  const masteries = state.weaponMasteries ?? [];
  const whispers = card.preparedWhispers ?? [];
  const needsSubclass = !!result.pending.subclass;
  const needsClass = !card.classId;
  const needsBackground = !card.backgroundId;
  const backgroundRemaining = automation.background ? Math.max(0, 3 - automation.bonusUsed) : 0;
  const classRemaining = klass ? Math.max(0, klass.skillChoices.count - classSkills.length) : 0;
  const featRemaining = automation.background?.feat === "Skilled" ? Math.max(0, 3 - featSkills.length) : 0;
  const expertiseRemaining = Math.max(0, expertiseLimit - expertise.length);
  const masteryRemaining = Math.max(0, masteryCount - masteries.length);
  const whisperRemaining = Math.max(0, whisperLimit - whispers.length);
  const recordedRemaining = recordedChoices.filter((choice) => !state.levelChoices?.[choice.key]?.trim()).length;
  const setupRemaining = Number(needsClass) + Number(needsBackground) + backgroundRemaining + classRemaining + featRemaining;
  const upgradeRemaining = Number(needsSubclass) + expertiseRemaining + masteryRemaining + whisperRemaining + recordedRemaining;
  const remaining = setupRemaining + upgradeRemaining;
  const levelChange = target > saved.level;
  const unacknowledged = target > (saved.lastSeenLevel ?? 0);
  const canSave = !model.readOnly && (levelChange || unacknowledged || stage.hasChanges) && remaining === 0;
  const changes = [
    ["Maximum HP", stage.currentResult.fields.hpMax, stage.previewResult.fields.hpMax],
    ["Maximum sanity", stage.currentResult.fields.sanityMax, stage.previewResult.fields.sanityMax],
    ["Hit dice", stage.currentResult.fields.hdMax, stage.previewResult.fields.hdMax],
    ["Proficiency", stage.currentResult.fields.profBonus, stage.previewResult.fields.profBonus],
  ].filter(([, before, after]) => before !== after);

  function saveUpgrade() {
    if (!canSave) return;
    const setupComplete = !!card.classId && !!card.backgroundId && automation.pointsLeft === 0 && setupRemaining === 0;
    stage.apply({
      lastSeenLevel: target,
      sheetAutomation: setupComplete ? { ...state, setupComplete: true } : state,
    });
    onComplete();
  }

  return <div className="v4-upgrade-flow">
    <section className="v4-upgrade-hero">
      <span>{levelChange ? "Insight threshold reached" : "Unfinished level choices"}</span>
      <div><small>Level {saved.level}</small><i aria-hidden="true">-&gt;</i><strong>Level {target}</strong></div>
      <p>Nothing below changes your saved hunter until you finish every required choice and select Save upgrade.</p>
    </section>

    <section className="v4-upgrade-section">
      <header><span>Automatic changes</span><h3>What this upgrade affects</h3></header>
      {changes.length > 0 ? <div className="v4-upgrade-changes">{changes.map(([label, before, after]) => <article key={label as string}><span>{label}</span><s>{valueOf(before)}</s><b>{valueOf(after)}</b></article>)}</div> : <p className="v4-upgrade-empty">This upgrade adds choices and features without changing these core totals.</p>}
    </section>

    <section className="v4-upgrade-section">
      <header><span>Unlocked</span><h3>New features and their effects</h3></header>
      {features.length > 0 ? <div className="v4-upgrade-features">{features.map((feature) => <details key={feature.key}><summary><small>Level {feature.level}</small><b>{feature.name}</b></summary><p>{feature.text}</p></details>)}</div> : <p className="v4-upgrade-empty">No new named class feature is waiting.</p>}
    </section>

    {setupRemaining > 0 && <section className="v4-upgrade-section v4-upgrade-decisions">
      <header><span>Character foundation</span><h3>{setupRemaining} setup choice{setupRemaining === 1 ? "" : "s"} left</h3></header>
      {(needsClass || needsBackground) && <div className="v4-upgrade-foundation"><span><b>Choose {needsClass && needsBackground ? "a class and background" : needsClass ? "a class" : "a background"} first</b><small>Hunter identity belongs in Hunter &amp; build. Return here afterward to finish the choices those selections unlock.</small></span><button type="button" onClick={onOpenHunter}>Open Hunter &amp; build</button></div>}
      {automation.background && backgroundRemaining > 0 && <div className="v4-upgrade-choice-group"><h4>Background ability points <small>Place {backgroundRemaining} more</small></h4><p>Use +2 and +1 on different eligible abilities, or three +1 bonuses.</p><div className="v4-upgrade-ability-picks">{automation.background.abilityScores.map((key) => <label key={key}><span>{ABILITY_NAME[key]}</span><select aria-label={`${ABILITY_NAME[key]} background bonus`} value={automation.bonuses[key] ?? 0} disabled={model.readOnly} onChange={(event) => automation.setBonus(key, Number(event.target.value))}><option value="0">+0</option><option value="1">+1</option><option value="2">+2</option></select></label>)}</div></div>}
      {klass && classRemaining > 0 && <div className="v4-upgrade-choice-group"><h4>{klass.title} skills <small>Choose {classRemaining}</small></h4>{klass.skillChoices.options.map((skill) => <ChoiceToggle key={skill} label={skill} checked={classSkills.includes(skill)} disabled={model.readOnly || (!classSkills.includes(skill) && classSkills.length >= klass.skillChoices.count)} onChange={() => automation.toggleClassSkill(skill)} />)}</div>}
      {automation.background?.feat === "Skilled" && featRemaining > 0 && <div className="v4-upgrade-choice-group"><h4>Skilled feat <small>Choose {featRemaining}</small></h4>{[...SKILLS.map((skill) => skill.name), ...TOOL_PROFICIENCIES].map((choice) => <ChoiceToggle key={choice} label={choice} checked={featSkills.includes(choice)} disabled={model.readOnly || (!featSkills.includes(choice) && featSkills.length >= 3)} onChange={() => automation.toggleFeatSkill(choice)} />)}</div>}
    </section>}

    {(upgradeRemaining > 0 || recordedChoices.length > 0) && <section className="v4-upgrade-section v4-upgrade-decisions">
      <header><span>Your level decisions</span><h3>{upgradeRemaining > 0 ? `${upgradeRemaining} choice${upgradeRemaining === 1 ? "" : "s"} left` : "Choices complete"}</h3></header>
      {needsSubclass && klass && <label className="v4-upgrade-select"><span>{klass.name} path</span><select value={card.subclassId ?? ""} disabled={model.readOnly} onChange={(event) => automation.chooseSubclass(event.target.value)}><option value="">Choose a path...</option>{klass.subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} - {entry.tagline}</option>)}</select><small>{result.pending.subclass?.reason}</small></label>}
      {expertiseLimit > 0 && expertiseRemaining > 0 && <div className="v4-upgrade-choice-group"><h4>Expertise <small>Choose {expertiseRemaining}</small></h4>{SKILLS.filter((skill) => card.skillProficiencies.includes(skill.name)).map((skill) => <ChoiceToggle key={skill.name} label={skill.name} meta={`Double proficiency on ${skill.name} checks`} checked={expertise.includes(skill.name)} disabled={model.readOnly || (!expertise.includes(skill.name) && expertise.length >= expertiseLimit)} onChange={() => automation.toggleExpertise(skill.name)} />)}</div>}
      {masteryCount > 0 && masteryRemaining > 0 && <div className="v4-upgrade-choice-group"><h4>Weapon mastery <small>Choose {masteryRemaining}</small></h4>{masteryWeapons.map((weapon) => <ChoiceToggle key={weapon.id} label={weapon.name} meta={`${weapon.carry} weapon mastery`} checked={masteries.includes(weapon.name)} disabled={model.readOnly || (!masteries.includes(weapon.name) && masteries.length >= masteryCount)} onChange={() => automation.toggleMastery(weapon.name)} />)}</div>}
      {whisperLimit > 0 && whisperRemaining > 0 && <div className="v4-upgrade-choice-group"><h4>Prepared Whispers <small>Choose {whisperRemaining}</small></h4>{WHISPERS.map((whisper) => <ChoiceToggle key={whisper.id} label={whisper.name} checked={whispers.includes(whisper.id)} disabled={model.readOnly || (!whispers.includes(whisper.id) && whispers.length >= whisperLimit)} onChange={() => automation.toggleWhisper(whisper.id)} />)}</div>}
      {recordedChoices.map((choice) => <label className="v4-upgrade-record" key={choice.key}><span><b>{choice.name}</b><small>Level {choice.level}. Read its effect above, then record the option you chose.</small></span><input value={state.levelChoices?.[choice.key] ?? ""} disabled={model.readOnly} placeholder="Type your choice" onChange={(event) => automation.setLevelChoice(choice.key, event.target.value)} /></label>)}
    </section>}

    <footer className="v4-upgrade-actions">
      <span>{remaining > 0 ? `Complete ${remaining} remaining choice${remaining === 1 ? "" : "s"} to save.` : "Ready to apply the full upgrade."}</span>
      <button type="button" disabled={!canSave} onClick={saveUpgrade}>Save upgrade</button>
    </footer>
  </div>;
}
