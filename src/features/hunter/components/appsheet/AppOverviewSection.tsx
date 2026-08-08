import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { DEEPCALLER_RITES, DEEPCALLER_WHISPERS, type DeepcallerReference, whisperDamageAtLevel } from "@/data/characterOptions";
import { Link } from "react-router-dom";
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
  type AppSheetModel,
} from "./appSheetShared";
import { sheetBool, sheetText } from "./appSheetValues";
import { useAppEditStage } from "./appEditStageContext";

function numeric(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PENDING_TARGETS = {
  background: { href: "#appsheet-character-build", openLabel: "Character build" },
  subclass: { href: "#appsheet-character-build", openLabel: "Character build" },
  backgroundPoints: { href: "#appsheet-abilities", openLabel: "Abilities & skills" },
  classSkills: { href: "#appsheet-abilities", openLabel: "Abilities & skills" },
  featSkills: { href: "#appsheet-abilities", openLabel: "Abilities & skills" },
  levelChoices: { href: "#appsheet-features", openLabel: "Features & choices" },
  whispers: { href: "#appsheet-features", openLabel: "Features & choices" },
} as const;

function DeepcallerReferenceRow({ entry, characterLevel }: { entry: DeepcallerReference; characterLevel: number }) {
  const damage = entry.kind === "Whisper" ? whisperDamageAtLevel(entry, characterLevel) : entry.damage;
  return (
    <details className="appsheet-rite-reference">
      <summary>
        <span><b>{entry.name}</b><small>{entry.kind === "Whisper" ? "Whisper" : `Level ${entry.level} Rite`} · {entry.school}</small></span>
        <span>{damage === "—" ? "No damage" : `${damage} ${entry.damageType}`}</span>
      </summary>
      <div>
        <dl>
          <div><dt>Perform</dt><dd>{entry.performing}</dd></div>
          <div><dt>Range</dt><dd>{entry.range}</dd></div>
          <div><dt>Duration</dt><dd>{entry.duration}</dd></div>
          <div><dt>Damage</dt><dd>{damage}</dd></div>
          <div><dt>Damage type</dt><dd>{entry.damageType}</dd></div>
        </dl>
        <Link to={`/codex?group=Rites&q=${encodeURIComponent(entry.name)}`}>Read the full rule in Codex</Link>
      </div>
    </details>
  );
}

export function AppOverviewSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const editStage = useAppEditStage();
  const { card, result, klass, background, state } = automation;
  const subclassOptions = klass?.subclasses ?? [];
  const pending = Object.entries(result.pending).flatMap(([key, choice]) => {
    if (!choice) return [];
    const target = PENDING_TARGETS[key as keyof typeof PENDING_TARGETS];
    return target ? [{ ...choice, ...target, key }] : [];
  });
  const name = sheetText(model.data, "name") || card.name;
  const hpCurrent = sheetText(model.data, "hpCur") || String(card.currentHp ?? result.fields.hpMax ?? 0);
  const sanityCurrent = sheetText(model.data, "sanityCur") || String(card.sanity ?? result.fields.sanityMax ?? 0);
  const hitDiceCurrent = numeric(sheetText(model.data, "hdCur"), numeric(String(result.fields.hdMax ?? 0)));
  const strainMaximum = numeric(String(result.fields.strainMax ?? 0));
  const strainCurrent = numeric(sheetText(model.data, "strainCur"), strainMaximum);
  const strainLevel = String(result.fields.strainLevel ?? "—");
  const currentStrainLevel = numeric(strainLevel);
  const preparedWhispers = (card.preparedWhispers ?? [])
    .map((id) => DEEPCALLER_WHISPERS.find((entry) => entry.id === id))
    .filter((entry): entry is DeepcallerReference => entry != null);
  const availableRites = DEEPCALLER_RITES.filter((rite) => rite.level <= currentStrainLevel);
  const deathSuccesses = [1, 2, 3].filter((number) => sheetBool(model.data, `dsS${number}`)).length;
  const deathFailures = [1, 2, 3].filter((number) => sheetBool(model.data, `dsF${number}`)).length;
  const openPendingChoice = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    target.setAttribute("open", "");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
    window.history.replaceState(null, "", href);
  };

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
        <div className="appsheet-required-choices" role="status" aria-labelledby="required-choices-title">
          <div className="appsheet-required-choices-heading">
            <span aria-hidden="true">!</span>
            <div>
              <b id="required-choices-title">{pending.length} decision{pending.length === 1 ? "" : "s"} needs your attention</b>
              <p>Use the red action below to jump straight to what needs choosing.</p>
            </div>
          </div>
          <ul>
            {pending.map((choice) => (
              <li key={choice.key}>
                <a href={choice.href} onClick={openPendingChoice(choice.href)}>
                  <span>
                    <b>Choose {choice.remaining} {choice.label}{choice.remaining === 1 ? "" : "s"}</b>
                    <small>{choice.reason}</small>
                  </span>
                  <em>Choose now <span className="appsheet-visually-hidden">in {choice.openLabel}</span> →</em>
                </a>
              </li>
            ))}
          </ul>
        </div>
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
            <DerivedValue label="Sanity die" value={result.fields.sanityDice} reason={result.reasons.sanityDice} testId="appsheet-sanity-die" />
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
          id="appsheet-character-build"
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

        {klass?.id === "deepcaller" && (
          <AppDisclosure
            title="Rites & Whispers"
            summary={`Strain level ${strainLevel} · ${availableRites.length} Rites available`}
            className="appsheet-rites-disclosure"
          >
            <p className="appsheet-rites-intro">Damage and upgrades are shown for level {card.level}. Open an entry for its casting details and the full rule.</p>
            <AppPanel title="Prepared Whispers" aside={<span className="appsheet-status-word">{preparedWhispers.length} prepared</span>}>
              {preparedWhispers.length > 0 ? (
                <div className="appsheet-rite-reference-list">
                  {preparedWhispers.map((whisper) => <DeepcallerReferenceRow key={whisper.id} entry={whisper} characterLevel={card.level} />)}
                </div>
              ) : <p className="appsheet-empty-copy">Choose your prepared Whispers in Features & choices.</p>}
            </AppPanel>
            <AppPanel title={`Rites available with level ${strainLevel} Strains`}>
              <div className="appsheet-rite-reference-list">
                {availableRites.map((rite) => <DeepcallerReferenceRow key={rite.id} entry={rite} characterLevel={card.level} />)}
              </div>
            </AppPanel>
          </AppDisclosure>
        )}

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
