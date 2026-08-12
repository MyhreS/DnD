import { useRef, useState } from "react";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4UpgradeChoices, type UpgradeChoiceKind } from "./View4UpgradeChoices";
import { View4UpgradeFeatPage } from "./View4UpgradeFeatPage";
import { earnedLevel, upgradeFeatureComplete, upgradeFeatures, type UpgradeFeature } from "./upgradeModel";

type Step = { id: string; title: string; kind: "automatic" | "choice" | "feature" | "review"; choice?: UpgradeChoiceKind; feature?: UpgradeFeature };

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function View4Upgrade({ model, onComplete }: { model: AppSheetModel; onComplete: () => void }) {
  const flowRef = useRef<HTMLDivElement>(null);
  const [requestedStep, setRequestedStep] = useState(0);
  const stage = useAppEditStage();
  const automation = useCharacterAutomation();
  const { card, klass, result, state } = automation;
  const saved = stage.savedCard;
  const target = earnedLevel(card);
  const startLevel = Math.min(saved.level, saved.lastSeenLevel ?? saved.level);
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
  const remaining = Number(needsSetup && !card.classId) + Number(needsSetup && !card.backgroundId) + backgroundRemaining + classRemaining + featRemaining
    + Number(needsSubclass) + expertiseRemaining + masteryRemaining + whisperRemaining + incompleteFeatures.length;
  const levelChange = target > saved.level;
  const unacknowledged = target > (saved.lastSeenLevel ?? 0);
  const canSave = !model.readOnly && (levelChange || unacknowledged || stage.hasChanges) && remaining === 0;
  const changes = ([
    ["Level", saved.level, target, "Insight unlock"],
    ["Maximum HP", stage.currentResult.fields.hpMax, stage.previewResult.fields.hpMax, "Class hit die + Constitution + feats"],
    ["Maximum sanity", stage.currentResult.fields.sanityMax, stage.previewResult.fields.sanityMax, "Class progression"],
    ["Hit dice", stage.currentResult.fields.hdMax, stage.previewResult.fields.hdMax, "One die per level"],
    ["Proficiency", stage.currentResult.fields.profBonus, stage.previewResult.fields.profBonus, "Class table"],
  ] as Array<[string, unknown, unknown, string]>).filter(([, before, after]) => before !== after);
  const [choicePages] = useState(() => ({
    expertise: expertiseRemaining > 0 || features.some((feature) => /^expertise$/i.test(feature.name)),
    mastery: masteryRemaining > 0 || features.some((feature) => /weapon mastery/i.test(feature.name)),
    whispers: whisperRemaining > 0,
  }));

  const steps: Step[] = [{ id: "automatic", title: "Automatic changes", kind: "automatic" }];
  if (needsSetup) steps.push({ id: "class", title: "Choose class", kind: "choice", choice: "class" });
  if (needsSetup) steps.push({ id: "background", title: "Choose background", kind: "choice", choice: "background" });
  if (needsSetup && automation.background) steps.push({ id: "background-abilities", title: "Background abilities", kind: "choice", choice: "background-abilities" });
  if (needsSetup && klass) steps.push({ id: "class-skills", title: "Class skills", kind: "choice", choice: "class-skills" });
  if (needsSetup && automation.background?.feat === "Skilled") steps.push({ id: "skilled", title: "Skilled feat", kind: "choice", choice: "skilled" });
  if ((needsSubclass || features.some((feature) => /subclass/i.test(feature.name))) && klass?.subclasses.length) steps.push({ id: "subclass", title: "Choose subclass", kind: "choice", choice: "subclass" });
  if (choicePages.expertise) steps.push({ id: "expertise", title: "Choose Expertise", kind: "choice", choice: "expertise" });
  if (choicePages.mastery) steps.push({ id: "mastery", title: "Weapon mastery", kind: "choice", choice: "mastery" });
  if (choicePages.whispers) steps.push({ id: "whispers", title: "Prepare Whispers", kind: "choice", choice: "whispers" });
  for (const feature of features.filter((entry) => !/subclass|^expertise$|weapon mastery/i.test(entry.name))) steps.push({ id: feature.key, title: feature.name, kind: "feature", feature });
  steps.push({ id: "review", title: "Review & save", kind: "review" });
  const stepIndex = Math.min(requestedStep, steps.length - 1);
  const step = steps[stepIndex];

  function saveUpgrade() {
    if (!canSave) return;
    const setupComplete = !!card.classId && !!card.backgroundId && automation.pointsLeft === 0 && remaining === 0;
    stage.apply({ lastSeenLevel: target, sheetAutomation: setupComplete ? { ...state, setupComplete: true } : state });
    onComplete();
  }

  function goToStep(next: number) {
    setRequestedStep(next);
    flowRef.current?.closest(".v4-overlay-content")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div ref={flowRef} className="v4-upgrade-flow">
    <header className="v4-upgrade-step-header"><span>Step {stepIndex + 1} of {steps.length}</span><i><b style={{ width: `${(stepIndex + 1) / steps.length * 100}%` }} /></i><h3>{step.title}</h3></header>
    <main className="v4-upgrade-step" key={step.id}>
      {step.kind === "automatic" && <AutomaticChanges changes={changes} />}
      {step.kind === "choice" && step.choice && <View4UpgradeChoices kind={step.choice} target={target} />}
      {step.kind === "feature" && step.feature && <View4UpgradeFeatPage feature={step.feature} state={state} />}
      {step.kind === "review" && <Review changes={changes} features={features} state={state} remaining={remaining} />}
    </main>
    <footer className="v4-upgrade-actions"><button type="button" className="back" disabled={stepIndex === 0} onClick={() => goToStep(stepIndex - 1)}>Previous</button><span>{remaining > 0 ? `${remaining} choice${remaining === 1 ? "" : "s"} left` : "Ready to save"}</span>{step.kind === "review" ? <button type="button" disabled={!canSave} onClick={saveUpgrade}>Save upgrade</button> : <button type="button" onClick={() => goToStep(stepIndex + 1)}>Next</button>}</footer>
  </div>;
}

function AutomaticChanges({ changes }: { changes: Array<[string, unknown, unknown, string]> }) {
  return <div className="v4-upgrade-automatic"><p>These values update automatically when the upgrade is saved.</p>{changes.map(([label, before, after, reason]) => { const a = numberValue(before); const b = numberValue(after); return <article key={label}><span><b>{label}</b><small>{reason}</small></span><s>{String(before ?? "—")}</s><i>→</i><strong>{String(after ?? "—")}</strong>{a != null && b != null && a !== b && <em>+{b - a}</em>}</article>; })}</div>;
}

function Review({ changes, features, state, remaining }: { changes: Array<[string, unknown, unknown, string]>; features: UpgradeFeature[]; state: ReturnType<typeof useCharacterAutomation>["state"]; remaining: number }) {
  return <div className="v4-upgrade-review"><p>{remaining > 0 ? `Finish ${remaining} highlighted choice${remaining === 1 ? "" : "s"} before saving.` : "Everything below will be applied together."}</p><div>{changes.map(([label, , after]) => <span key={label}><small>{label}</small><b>{String(after ?? "—")}</b></span>)}</div>{features.length > 0 && <ul>{features.map((feature) => <li key={feature.key}><span><small>Level {feature.level}</small><b>{feature.name}</b></span><em>{state.levelChoices?.[feature.key] ?? "Automatic"}</em></li>)}</ul>}</div>;
}
