import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { BackgroundDetails } from "../BackgroundDetails";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import {
  AppDisclosure,
  AppPanel,
  AppSection,
  AppSelect,
  AutoReason,
  DecisionField,
  DerivedValue,
  NumericStepper,
  PendingNotice,
  type AppSheetModel,
} from "./appSheetShared";
import { sheetBool, sheetText } from "./appSheetValues";
import { useAppEditStage } from "./appEditStageContext";

function numeric(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AppOverviewSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const editStage = useAppEditStage();
  const { card, result, klass, background, state } = automation;
  const subclassOptions = klass?.subclasses ?? [];
  const pending = Object.values(result.pending).filter(Boolean);
  const name = sheetText(model.data, "name") || card.name;
  const hpCurrent = sheetText(model.data, "hpCur") || String(card.currentHp ?? result.fields.hpMax ?? 0);
  const sanityCurrent = sheetText(model.data, "sanityCur") || String(card.sanity ?? result.fields.sanityMax ?? 0);
  const hitDiceCurrent = numeric(sheetText(model.data, "hdCur"), numeric(String(result.fields.hdMax ?? 0)));
  const strainMaximum = numeric(String(result.fields.strainMax ?? 0));
  const strainCurrent = numeric(sheetText(model.data, "strainCur"), strainMaximum);
  const strainLevel = String(result.fields.strainLevel ?? "—");
  const deathSuccesses = [1, 2, 3].filter((number) => sheetBool(model.data, `dsS${number}`)).length;
  const deathFailures = [1, 2, 3].filter((number) => sheetBool(model.data, `dsF${number}`)).length;

  return (
    <AppSection title="Overview" defaultOpen>
      <div className="appsheet-character-profile">
        <input
          className="appsheet-character-name"
          data-f="name"
          data-testid="appsheet-name"
          aria-label="Hunter name"
          value={name}
          disabled={model.readOnly}
          placeholder="Unnamed hunter"
          onChange={(event) => model.setFields({ name: event.target.value }, { name: event.target.value })}
        />
        <div className="appsheet-character-meta" aria-label="Character summary">
          <span>{klass?.title ?? "No class"}</span>
          <span>Level {editStage.previewCard.level}</span>
          <span>{background?.name ?? "No background"}</span>
        </div>
      </div>

      {pending.length > 0 && (
        <PendingNotice>
          <b>{pending.length} character {pending.length === 1 ? "decision" : "decisions"} remaining</b>
          <p>Complete the highlighted choices under Features or Abilities &amp; skills below.</p>
        </PendingNotice>
      )}

      <div className="appsheet-overview-layout">
        <AppPanel title="At a glance" className="appsheet-current-state">
          <div className={`appsheet-vital-editors${klass?.caster ? " has-strains" : ""}`}>
            <DecisionField label="Current HP">
              <NumericStepper label="HP" value={editStage.previewCard.currentHp ?? numeric(hpCurrent)} disabled={model.readOnly} onChange={editStage.stageHp} />
              <small>Maximum {result.fields.hpMax}</small>
            </DecisionField>
            <DecisionField label="Current sanity">
              <NumericStepper label="sanity" value={editStage.previewCard.sanity ?? numeric(sanityCurrent)} disabled={model.readOnly} onChange={editStage.stageSanity} />
              <small>Maximum {result.fields.sanityMax}</small>
            </DecisionField>
            <DecisionField label="Insight">
              <NumericStepper label="Insight" value={card.insight ?? numeric(sheetText(model.data, "insight"))} disabled={model.readOnly} onChange={(insight) => model.setFields({ insight: String(insight) }, { insight })} />
            </DecisionField>
            <DecisionField label="Transformation">
              <NumericStepper label="Transformation" value={editStage.previewCard.transformationLevel ?? 0} max={10} disabled={model.readOnly} onChange={editStage.stageTransformation} />
              <small>Reducing it clears active transformations.</small>
            </DecisionField>
            {klass?.caster && (
              <div data-testid="appsheet-strains">
                <DecisionField label="Strains left">
                  <NumericStepper label="Strains left" value={strainCurrent} max={strainMaximum} disabled={model.readOnly} onChange={(value) => model.setField("strainCur", String(value))} />
                  <small>{strainMaximum} available · level {strainLevel} Strains</small>
                </DecisionField>
              </div>
            )}
          </div>
          <div className="appsheet-metric-grid">
            <DerivedValue label="Armor class" value={result.fields.ac} reason={result.reasons.ac} testId="appsheet-ac" />
            <DerivedValue label="Speed" value={result.fields.speed} reason={result.reasons.speed} />
            <DerivedValue label="Initiative" value={result.fields.initiative} reason={result.reasons.initiative} />
            <DerivedValue label="Passive perception" value={result.fields.passivePerception} reason={result.reasons.passivePerception} />
          </div>
        </AppPanel>

        <AppDisclosure
          key={state.setupComplete === true ? "build-complete" : "build-pending"}
          title="Character build"
          summary={`${klass?.title ?? "No class"} · ${background?.name ?? "No background"} · level ${editStage.previewCard.level}`}
          defaultOpen={state.setupComplete !== true}
          className="appsheet-identity-panel"
        >
          <div className="appsheet-form-grid">
            <AppSelect
              label="Class"
              value={card.classId}
              disabled={model.readOnly}
              data-testid="appsheet-class"
              help="Sets HP, saves, training, features, and class choices."
              onChange={(event) => automation.chooseClass(event.target.value)}
            >
              <option value="">Choose class…</option>
              {CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
            </AppSelect>
            <AppSelect
              label="Background"
              value={card.backgroundId ?? ""}
              disabled={model.readOnly}
              data-testid="appsheet-background"
              help="Sets ability options, skills, feat, tools, and starting gear."
              onChange={(event) => automation.chooseBackground(event.target.value)}
            >
              <option value="">Choose background…</option>
              {BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </AppSelect>
            <BackgroundDetails background={background} className="appsheet-background-details" />
            <DecisionField label="Level">
              <div className="appsheet-stepper" data-testid="appsheet-level">
                <button type="button" aria-label="Decrease level" disabled={model.readOnly || editStage.previewCard.level <= 1} onClick={() => editStage.stageLevel(editStage.previewCard.level - 1)}>−</button>
                <output>{editStage.previewCard.level}</output>
                <button type="button" aria-label="Increase level" disabled={model.readOnly || editStage.previewCard.level >= 20} onClick={() => editStage.stageLevel(editStage.previewCard.level + 1)}>+</button>
              </div>
              <small>Preview changes to HP, proficiency, features, and choices before applying.</small>
            </DecisionField>
            <AppSelect
              label="Subclass"
              value={card.subclassId ?? ""}
              disabled={model.readOnly || !klass || card.level < 3}
              data-testid="appsheet-subclass"
              help={card.level < 3 ? "Subclass becomes available at level 3." : "Adds its features to your progression."}
              onChange={(event) => automation.chooseSubclass(event.target.value)}
            >
              <option value="">{card.level < 3 ? "Available at level 3" : "Choose subclass…"}</option>
              {subclassOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </AppSelect>
          </div>
        </AppDisclosure>

        <AppDisclosure
          title="Battle resources"
          summary={`Temp HP ${numeric(sheetText(model.data, "hpTemp"))} · Hit dice ${hitDiceCurrent}/${result.fields.hdMax}`}
          className="appsheet-battle-resources"
        >
          <div className="appsheet-inline-fields">
            {([
              ["hpTemp", "Temporary HP", 0],
              ["hdCur", "Hit dice current", numeric(String(result.fields.hdMax ?? 0))],
              ["hdSpent", "Hit dice spent", 0],
            ] as const).map(([field, label, fallback]) => (
              <DecisionField key={field} label={label}>
                <NumericStepper label={label} value={numeric(sheetText(model.data, field), fallback)} disabled={model.readOnly} onChange={(value) => model.setField(field, String(value))} />
              </DecisionField>
            ))}
            <DerivedValue label="Hit dice maximum" value={result.fields.hdMax} reason={result.reasons.hdMax} />
          </div>
          <div className="appsheet-toggle-line">
            <label><input type="checkbox" checked={card.bloodTinge === true} disabled={model.readOnly} onChange={(event) => model.setFields({ bloodTinge: event.target.checked }, { bloodTinge: event.target.checked })} /> Blood Tinge held</label>
            <label><input type="checkbox" checked={sheetBool(model.data, "insane")} disabled={model.readOnly} onChange={(event) => model.setField("insane", event.target.checked)} /> Insane</label>
          </div>
        </AppDisclosure>
        <AppDisclosure
          title="Death saves"
          summary={deathSuccesses || deathFailures ? `${deathSuccesses} successes · ${deathFailures} failures` : "None marked"}
          className="appsheet-death-panel"
        >
          <div className="appsheet-death-saves">
            {(["S", "F"] as const).map((kind) => (
              <div key={kind}>
                <span>{kind === "S" ? "Successes" : "Failures"}</span>
                <div>
                  {[1, 2, 3].map((number) => {
                    const field = `ds${kind}${number}`;
                    return <label key={field}><input type="checkbox" aria-label={`${kind === "S" ? "Death save success" : "Death save failure"} ${number}`} checked={sheetBool(model.data, field)} disabled={model.readOnly} onChange={(event) => model.setField(field, event.target.checked)} /><span>{number}</span></label>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <AutoReason reason="Death saves are table state, so the player records them rather than the rules engine calculating them." />
        </AppDisclosure>
      </div>
    </AppSection>
  );
}
