import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import {
  AppPanel,
  AppSection,
  AppSelect,
  AutoReason,
  DecisionField,
  DerivedValue,
  NumericStepper,
  PendingNotice,
  sheetBool,
  sheetText,
  type AppSheetModel,
} from "./appSheetShared";
import { useAppEditStage } from "./AppEditStage";

function numeric(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AppOverviewSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const editStage = useAppEditStage();
  const { card, result, klass, background } = automation;
  const subclassOptions = klass?.subclasses ?? [];
  const pending = Object.values(result.pending).filter(Boolean);
  const name = sheetText(model.data, "name") || card.name;
  const hpCurrent = sheetText(model.data, "hpCur") || String(card.currentHp ?? result.fields.hpMax ?? 0);
  const sanityCurrent = sheetText(model.data, "sanityCur") || String(card.sanity ?? result.fields.sanityMax ?? 0);

  return (
    <AppSection
      eyebrow="Hunter dossier"
      title={name || "Unnamed hunter"}
      intro="The decisions here drive the rest of the character. Calculated values explain exactly what set them."
    >
      {pending.length > 0 && (
        <PendingNotice>
          <b>{pending.length} character {pending.length === 1 ? "decision" : "decisions"} remaining</b>
          <p>Open Abilities &amp; skills or Features to complete the highlighted choices.</p>
        </PendingNotice>
      )}

      <div className="appsheet-overview-grid">
        <AppPanel title="Identity" className="appsheet-identity-panel">
          <div className="appsheet-form-grid">
            <DecisionField label="Hunter name">
              <input
                data-f="name"
                data-testid="appsheet-name"
                value={name}
                disabled={model.readOnly}
                placeholder="Name your hunter"
                onChange={(event) => model.setFields({ name: event.target.value }, { name: event.target.value })}
              />
            </DecisionField>
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
          {(klass || background) && (
            <div className="appsheet-choice-impact">
              {klass && <p><b>{klass.title}</b> · {klass.primaryAbility} · d{klass.hitDie} Hit Die · {klass.sanityDie} Sanity Dice</p>}
              {background && <p><b>{background.name}</b> · {background.feat ?? "No readable source feat"} · {background.skills.join(" & ")}</p>}
            </div>
          )}
        </AppPanel>

        <AppPanel title="At a glance">
          <div className="appsheet-vital-editors">
            <DecisionField label="Current HP">
              <NumericStepper label="HP" value={editStage.previewCard.currentHp ?? numeric(hpCurrent)} disabled={model.readOnly} onChange={editStage.stageHp} />
              <small>Changes are previewed before saving.</small>
            </DecisionField>
            <DecisionField label="Current sanity">
              <NumericStepper label="sanity" value={editStage.previewCard.sanity ?? numeric(sanityCurrent)} disabled={model.readOnly} onChange={editStage.stageSanity} />
              <small>Changes are previewed before saving.</small>
            </DecisionField>
            <DecisionField label="Insight">
              <NumericStepper label="Insight" value={card.insight ?? numeric(sheetText(model.data, "insight"))} disabled={model.readOnly} onChange={(insight) => model.setFields({ insight: String(insight) }, { insight })} />
            </DecisionField>
            <DecisionField label="Transformation">
              <NumericStepper label="Transformation" value={editStage.previewCard.transformationLevel ?? 0} max={10} disabled={model.readOnly} onChange={editStage.stageTransformation} />
              <small>Reductions preview and clear active transformations.</small>
            </DecisionField>
          </div>
          <div className="appsheet-metric-grid">
            <DerivedValue label="Maximum HP" value={result.fields.hpMax} reason={result.reasons.hpMax} />
            <DerivedValue label="Maximum sanity" value={result.fields.sanityMax} reason={result.reasons.sanityMax} />
            <DerivedValue label="Armor class" value={result.fields.ac} reason={result.reasons.ac} testId="appsheet-ac" />
            <DerivedValue label="Speed" value={result.fields.speed} reason={result.reasons.speed} />
            <DerivedValue label="Initiative" value={result.fields.initiative} reason={result.reasons.initiative} />
            <DerivedValue label="Passive perception" value={result.fields.passivePerception} reason={result.reasons.passivePerception} />
          </div>
        </AppPanel>
      </div>

      <div className="appsheet-overview-grid secondary">
        <AppPanel title="Battle resources">
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
        </AppPanel>
        <AppPanel title="Death saves">
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
        </AppPanel>
      </div>
    </AppSection>
  );
}
