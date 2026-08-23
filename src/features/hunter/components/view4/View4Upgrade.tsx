import { useState } from "react";
import { AppAbilitiesSection } from "../appsheet/AppAbilitiesSection";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4Equipment } from "./View4Equipment";
import { View4PageLayout } from "./View4PageLayout";
import { View4UpgradeChoices, type UpgradeChoiceKind } from "./View4UpgradeChoices";
import { View4UpgradeFeatPage } from "./View4UpgradeFeatPage";
import { earnedLevel, upgradeFeatureComplete, upgradeFeatures, type UpgradeFeature } from "./upgradeModel";
import type { LevelFeature, Subclass } from "@/types";

type Step = { id: string; title: string; kind: "automatic" | "name" | "abilities" | "choice" | "equipment" | "feature" | "review"; choice?: UpgradeChoiceKind; feature?: UpgradeFeature };
type Change = [label: string, before: unknown, after: unknown, reason: string];
type PendingChoice = { stepId: string; label: string; detail: string; status: string; count: number };

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function View4Upgrade({ model, onComplete, creating = false }: { model: AppSheetModel; onComplete: () => void; creating?: boolean }) {
  const [requestedStep, setRequestedStep] = useState(0);
  const stage = useAppEditStage();
  const automation = useCharacterAutomation();
  const { card, klass, result, state } = automation;
  const saved = stage.savedCard;
  const target = earnedLevel(card);
  // Choosing a class for a new hunter deliberately stages lastSeenLevel 0.
  // Read the staged value so the class's level-one feature choices join the
  // flow immediately instead of being silently treated as already reviewed.
  const startLevel = creating ? 0 : Math.min(saved.level, card.lastSeenLevel ?? saved.lastSeenLevel ?? saved.level);
  const features = upgradeFeatures(klass, card.subclassId, startLevel, target);
  const needsSetup = !state.setupComplete;
  const needsSubclass = !!result.pending.subclass;
  const backgroundRemaining = needsSetup && automation.background ? Math.max(0, 3 - automation.bonusUsed) : 0;
  const classRemaining = needsSetup && klass ? Math.max(0, klass.skillChoices.count - state.classSkills.length) : 0;
  const featRemaining = needsSetup && automation.background?.feat === "Skilled" ? Math.max(0, 3 - (card.featSkills?.length ?? 0)) : 0;
  const expertiseRemaining = Math.max(0, automation.expertiseLimit - (state.expertiseSkills?.length ?? 0));
  const masteryRemaining = Math.max(0, automation.masteryCount - (state.weaponMasteries?.length ?? 0));
  const whisperRemaining = Math.max(0, automation.whisperLimit - (card.preparedWhispers?.length ?? 0));
  const incompleteFeatures = features.filter((feature) => !upgradeFeatureComplete(feature, state));
  const pendingChoices = ([
    creating && !card.name.trim() ? { stepId: "name", label: "Hunter name", detail: "Give this hunter a name.", status: "Enter a name", count: 1 } : null,
    needsSetup && !card.classId ? { stepId: "class", label: "Hunter class", detail: "Choose the class that defines this hunter.", status: "Choose a class", count: 1 } : null,
    needsSetup && !card.backgroundId ? { stepId: "background", label: "Background", detail: "Choose this hunter's background.", status: "Choose a background", count: 1 } : null,
    creating && automation.pointsLeft !== 0 ? { stepId: "abilities", label: "Ability scores", detail: "Spend the full ability-score budget.", status: automation.pointsLeft == null ? "Choose valid scores" : `${automation.pointsLeft} points left`, count: 1 } : null,
    backgroundRemaining > 0 ? { stepId: "background-abilities", label: "Background abilities", detail: `Place ${backgroundRemaining} remaining ability point${backgroundRemaining === 1 ? "" : "s"}.`, status: `${backgroundRemaining} point${backgroundRemaining === 1 ? "" : "s"} needed`, count: backgroundRemaining } : null,
    classRemaining > 0 ? { stepId: "class-skills", label: "Class skills", detail: `Choose ${classRemaining} more trained skill${classRemaining === 1 ? "" : "s"}.`, status: `${classRemaining} skill${classRemaining === 1 ? "" : "s"} needed`, count: classRemaining } : null,
    featRemaining > 0 ? { stepId: "skilled", label: "Skilled feat", detail: `Choose ${featRemaining} more skill or tool proficienc${featRemaining === 1 ? "y" : "ies"}.`, status: `${featRemaining} choice${featRemaining === 1 ? "" : "s"} needed`, count: featRemaining } : null,
    needsSubclass ? { stepId: "subclass", label: `${klass?.name ?? "Hunter"} path`, detail: "Choose the subclass gained at this level.", status: "Choose a subclass", count: 1 } : null,
    expertiseRemaining > 0 ? { stepId: "expertise", label: "Expertise", detail: `Choose ${expertiseRemaining} more skill${expertiseRemaining === 1 ? "" : "s"} for Expertise.`, status: `${expertiseRemaining} choice${expertiseRemaining === 1 ? "" : "s"} needed`, count: expertiseRemaining } : null,
    masteryRemaining > 0 ? { stepId: "mastery", label: "Weapon mastery", detail: `Choose ${masteryRemaining} more weapon${masteryRemaining === 1 ? "" : "s"} to master.`, status: `${masteryRemaining} weapon${masteryRemaining === 1 ? "" : "s"} needed`, count: masteryRemaining } : null,
    whisperRemaining > 0 ? { stepId: "whispers", label: "Prepared Whispers", detail: `Prepare ${whisperRemaining} more Whisper${whisperRemaining === 1 ? "" : "s"}.`, status: `${whisperRemaining} Whisper${whisperRemaining === 1 ? "" : "s"} needed`, count: whisperRemaining } : null,
    ...incompleteFeatures.map((feature) => ({ stepId: feature.key, label: feature.name, detail: `Complete this level ${feature.level} choice.`, status: "Choice needed", count: 1 })),
  ] satisfies Array<PendingChoice | null>).filter((choice): choice is PendingChoice => choice !== null);
  const remaining = pendingChoices.reduce((total, choice) => total + choice.count, 0);
  const levelChange = target > saved.level;
  const unacknowledged = target > (saved.lastSeenLevel ?? 0);
  const canSave = !model.readOnly && (levelChange || unacknowledged || stage.hasChanges) && remaining === 0;
  const changes = ([
    ["Level", saved.level, target, "Insight unlock"],
    ["Maximum HP", stage.currentResult.fields.hpMax, stage.previewResult.fields.hpMax, "Class hit die + Constitution + feats"],
    ["Maximum sanity", stage.currentResult.fields.sanityMax, stage.previewResult.fields.sanityMax, "Class progression"],
    ["Hit dice", stage.currentResult.fields.hdMax, stage.previewResult.fields.hdMax, "One die per level"],
    ["Proficiency", stage.currentResult.fields.profBonus, stage.previewResult.fields.profBonus, "Class table"],
  ] as Change[]).filter(([, before, after]) => before !== after);
  const selectedSubclass = klass?.subclasses.find((entry) => entry.id === card.subclassId);
  const subclassChanged = !!selectedSubclass && saved.subclassId !== selectedSubclass.id;
  const gainedSubclassFeatures = subclassChanged ? selectedSubclass.features.filter((feature) => feature.level <= target) : [];
  const gainedSubclassKeys = new Set(gainedSubclassFeatures.map((feature) => `${feature.level}:${feature.name}`));
  const creationValues: Array<[string, unknown]> = creating ? [
    ["Hunter", card.name || "Unnamed"],
    ["Class", klass?.title ?? "Not chosen"],
    ["Background", automation.background?.name ?? "Not chosen"],
    ["Armor", String(result.fields.mainArmor || "Unarmored")],
    ["Armor Class", result.fields.ac ?? "—"],
    ["Carrying", `${String(result.fields.weight ?? "0 lb")} · ${String(result.fields.weightCondition ?? "Unburdened")}`],
  ] : [];
  // Automatic changes may appear after class selection, but inserting a page
  // before the active class step would move the player backwards. The actual
  // choice pages are derived live so newly unlocked decisions can never remain
  // counted without a page of their own.
  const [showAutomatic] = useState(() => changes.length > 0);
  const choicePages = {
    subclass: needsSubclass || subclassChanged,
    expertise: expertiseRemaining > 0 || features.some((feature) => /^expertise$/i.test(feature.name)),
    mastery: masteryRemaining > 0
      || features.some((feature) => /weapon mastery/i.test(feature.name))
      || automation.masteryCount > (saved.sheetAutomation?.weaponMasteries?.length ?? 0),
    whispers: whisperRemaining > 0 || automation.whisperLimit > (saved.preparedWhispers?.length ?? 0),
  };

  const steps: Step[] = [];
  if (showAutomatic) steps.push({ id: "automatic", title: "Automatic changes", kind: "automatic" });
  if (creating) steps.push({ id: "name", title: "Name your hunter", kind: "name" });
  if (needsSetup) steps.push({ id: "class", title: "Choose class", kind: "choice", choice: "class" });
  if (needsSetup) steps.push({ id: "background", title: "Choose background", kind: "choice", choice: "background" });
  if (creating) steps.push({ id: "abilities", title: "Set ability scores", kind: "abilities" });
  if (needsSetup && automation.background) steps.push({ id: "background-abilities", title: "Background abilities", kind: "choice", choice: "background-abilities" });
  if (needsSetup && klass) steps.push({ id: "class-skills", title: "Class skills", kind: "choice", choice: "class-skills" });
  if (needsSetup && automation.background?.feat === "Skilled") steps.push({ id: "skilled", title: "Skilled feat", kind: "choice", choice: "skilled" });
  if (choicePages.subclass && klass?.subclasses.length) steps.push({ id: "subclass", title: "Choose subclass", kind: "choice", choice: "subclass" });
  if (choicePages.expertise) steps.push({ id: "expertise", title: "Choose Expertise", kind: "choice", choice: "expertise" });
  if (choicePages.mastery) steps.push({ id: "mastery", title: "Weapon mastery", kind: "choice", choice: "mastery" });
  if (choicePages.whispers) steps.push({ id: "whispers", title: "Prepare Whispers", kind: "choice", choice: "whispers" });
  for (const feature of features.filter((entry) => !/subclass|^expertise$|weapon mastery/i.test(entry.name) && !(choicePages.subclass && gainedSubclassKeys.has(`${entry.level}:${entry.name}`)))) steps.push({ id: feature.key, title: feature.name, kind: "feature", feature });
  if (creating) steps.push({ id: "equipment", title: "Armor & carrying", kind: "equipment" });
  steps.push({ id: "review", title: creating ? "Review your hunter" : "Review & save", kind: "review" });
  const stepIndex = Math.min(requestedStep, steps.length - 1);
  const step = steps[stepIndex];
  const stepPending = pendingChoices.find((choice) => choice.stepId === step.id);

  function saveUpgrade() {
    if (!canSave) return;
    const setupComplete = !!card.name.trim() && !!card.classId && !!card.backgroundId && automation.pointsLeft === 0 && remaining === 0;
    stage.apply({ lastSeenLevel: target, sheetAutomation: setupComplete ? { ...state, setupComplete: true } : state });
    onComplete();
  }

  function goToStep(next: number) {
    setRequestedStep(next);
  }

  function goToRequiredChoice(stepId: string) {
    const next = steps.findIndex((entry) => entry.id === stepId);
    if (next >= 0) goToStep(next);
  }

  return <View4PageLayout
    key={step.id}
    className="v4-upgrade-flow"
    contentClassName="v4-upgrade-step"
    header={<header className="v4-upgrade-step-header"><span>{creating ? `Character creation · Step ${stepIndex + 1}` : `Step ${stepIndex + 1} of ${steps.length}`}</span><i><b style={{ width: `${(stepIndex + 1) / steps.length * 100}%` }} /></i><h3>{step.title}</h3></header>}
    footer={<footer className="v4-upgrade-actions"><button type="button" className="back" disabled={stepIndex === 0} onClick={() => goToStep(stepIndex - 1)}>Previous</button><span>{step.kind === "review" ? (remaining > 0 ? `${remaining} choice${remaining === 1 ? "" : "s"} left` : creating ? "Ready to create" : "Ready to save") : stepPending?.status ?? (step.kind === "equipment" ? "Armor is optional" : "Step complete")}</span>{step.kind === "review" ? <button type="button" disabled={!canSave} onClick={saveUpgrade}>{creating ? "Create hunter" : "Save upgrade"}</button> : <button type="button" disabled={!!stepPending} onClick={() => goToStep(stepIndex + 1)}>Next</button>}</footer>}
  >
      {step.kind === "automatic" && <AutomaticChanges changes={changes} />}
      {step.kind === "name" && <CreationName model={model} name={card.name} />}
      {step.kind === "abilities" && <AppAbilitiesSection model={model} view="abilities" />}
      {step.kind === "choice" && step.choice && <View4UpgradeChoices kind={step.choice} target={target} />}
      {step.kind === "equipment" && <CreationEquipment model={model} />}
      {step.kind === "feature" && step.feature && <View4UpgradeFeatPage feature={step.feature} state={state} />}
      {step.kind === "review" && <Review changes={changes} creationValues={creationValues} features={features.filter((feature) => !/subclass/i.test(feature.name) && !gainedSubclassKeys.has(`${feature.level}:${feature.name}`))} state={state} remaining={remaining} pendingChoices={pendingChoices} onResolve={goToRequiredChoice} subclass={subclassChanged ? selectedSubclass : undefined} subclassFeatures={gainedSubclassFeatures} />}
  </View4PageLayout>;
}

function CreationName({ model, name }: { model: AppSheetModel; name: string }) {
  return <div className="v4-upgrade-choice-page v4-creation-name"><p>This name will appear on your character sheet and in your party.</p><label className="v4-upgrade-select"><span>Hunter name</span><input value={name} placeholder="Enter a name" onChange={(event) => model.setFields({ name: event.target.value }, { name: event.target.value })} /></label></div>;
}

function CreationEquipment({ model }: { model: AppSheetModel }) {
  return <div className="v4-creation-equipment"><p>Equip armor now or continue unarmored. The summary updates your Armor Class, total carried weight, and the effect that load has on this hunter.</p><View4Equipment model={model} /></div>;
}

function AutomaticChanges({ changes }: { changes: Change[] }) {
  return <div className="v4-upgrade-automatic"><p>These values update automatically when the upgrade is saved.</p>{changes.map(([label, before, after, reason]) => { const a = numberValue(before); const b = numberValue(after); return <article key={label}><span><b>{label}</b><small>{reason}</small></span><s>{String(before ?? "—")}</s><i>→</i><strong>{String(after ?? "—")}</strong>{a != null && b != null && a !== b && <em>+{b - a}</em>}</article>; })}</div>;
}

function Review({ changes, creationValues, features, state, remaining, pendingChoices, onResolve, subclass, subclassFeatures }: { changes: Change[]; creationValues: Array<[string, unknown]>; features: UpgradeFeature[]; state: ReturnType<typeof useCharacterAutomation>["state"]; remaining: number; pendingChoices: PendingChoice[]; onResolve: (stepId: string) => void; subclass?: Subclass; subclassFeatures: LevelFeature[] }) {
  const hasSummary = creationValues.length > 0 || changes.length > 0 || !!subclass || features.length > 0;
  function selectedChoice(feature: UpgradeFeature) {
    if (/weapon mastery/i.test(feature.name)) return state.weaponMasteries?.join(", ");
    if (/^expertise$/i.test(feature.name)) return state.expertiseSkills?.join(", ");
    return feature.choice ? state.levelChoices?.[feature.key] : undefined;
  }
  return <div className="v4-upgrade-review">
    <p>{remaining > 0 ? "Complete the required decisions below before saving." : "Everything below will be applied together."}</p>
    {pendingChoices.length > 0 && <section className="v4-upgrade-review-pending" aria-label="Required decisions"><header><small>Still needed</small><b>{remaining} choice{remaining === 1 ? "" : "s"} left</b></header>{pendingChoices.map((choice) => <button key={choice.stepId} type="button" onClick={() => onResolve(choice.stepId)}><span><b>{choice.label}</b><small>{choice.detail}</small></span><strong>Complete</strong></button>)}</section>}
    {creationValues.length > 0 && <div className="v4-upgrade-review-values">{creationValues.map(([label, value]) => <span key={label}><small>{label}</small><b>{String(value)}</b></span>)}</div>}
    {changes.length > 0 && <div className="v4-upgrade-review-values">{changes.map(([label, before, after]) => <span key={label}><small>{label}</small><b>{before == null ? String(after ?? "—") : `${String(before)} → ${String(after ?? "—")}`}</b></span>)}</div>}
    {subclass && <section className="v4-upgrade-review-subclass"><small>Subclass selected</small><h4>{subclass.name}</h4><p>{subclass.tagline}</p>{subclassFeatures.map((feature) => <article key={`${feature.level}:${feature.name}`}><span><small>Gained at level {feature.level}</small><b>{feature.name}</b></span><p>{feature.text}</p></article>)}</section>}
    {features.length > 0 && <ul>{features.map((feature) => { const choice = selectedChoice(feature); return <li key={feature.key}><span><small>Level {feature.level}</small><b>{feature.name}</b><p>{feature.text}</p></span>{choice && <em>{choice}</em>}</li>; })}</ul>}
    {!hasSummary && <p className="v4-upgrade-review-empty">No character changes are waiting to be saved.</p>}
  </div>;
}
