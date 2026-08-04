import { useState, type ReactNode } from "react";
import { ABILITY_NAME, MADUHAUSU_MAX, MADUHAUSU_MIN, POINT_BUY_MAX, POINT_BUY_MIN } from "@/data/abilities";
import { ARMOR, ARMOR_BY_ID } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { TOOL_PROFICIENCIES, WHISPERS } from "@/data/characterOptions";
import { ITEMS, ITEM_BY_ID } from "@/data/items";
import { SKILLS } from "@/data/skills";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { maxAddonPieces } from "@/lib/character";
import type { AbilityKey } from "@/types";
import type { BuyMode } from "../../lib/abilityBuy";
import { F, Sel } from "./sheetPrimitives";
import { useCharacterAutomation } from "./characterAutomationContext";

const EXTRA_SUBCATEGORIES = ["Head Gear", "Scarf", "Gloves", "Boots"] as const;

function AutoBlock({
  title,
  meta,
  testId,
  children,
}: {
  title: string;
  meta?: ReactNode;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="sheet-auto-block" data-testid={testId} aria-label={title}>
      <div className="sheet-auto-title">
        <h2>{title}</h2>
        {meta}
      </div>
      {children}
    </section>
  );
}

function Count({ remaining }: { remaining: number }) {
  return (
    <span className={remaining > 0 ? "sheet-auto-count pending" : "sheet-auto-count"}>
      {remaining} left
    </span>
  );
}

function CheckGrid({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="sheet-auto-checks">
      {values.map((value) => (
        <label key={value}>
          <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
          {value}
        </label>
      ))}
    </div>
  );
}

function reasonProps(reason: string | undefined) {
  return reason
    ? { "data-automated": true, "data-auto-reason": reason, title: `Automatically set · ${reason}` }
    : {};
}

/** Identity inputs remain in their original positions on page 1, but now write
 * the structured choices that drive every dependent calculation. */
export function AutomatedIdentityField({
  field,
}: {
  field: "class" | "subclass" | "background" | "level";
}) {
  const automation = useCharacterAutomation();
  const { card, klass, readOnly, result } = automation;
  if (readOnly) {
    if (field === "class") return <Sel f="class" options={CLASSES.map((entry) => entry.name)} />;
    return <F f={field} />;
  }

  if (field === "class") {
    return (
      <select
        data-f="class"
        data-testid="sheet-class"
        value={card.classId}
        data-empty={!card.classId || undefined}
        onChange={(event) => automation.chooseClass(event.target.value)}
        {...reasonProps(result.reasons.class)}
      >
        <option value="">Choose class…</option>
        {CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
      </select>
    );
  }

  if (field === "background") {
    const legacyValue = !card.backgroundId && card.background ? "__legacy__" : "";
    return (
      <select
        data-f="background"
        data-testid="sheet-background"
        value={card.backgroundId ?? legacyValue}
        data-empty={!card.backgroundId || undefined}
        onChange={(event) => automation.chooseBackground(event.target.value)}
        {...reasonProps(result.reasons.background)}
      >
        <option value="">Choose background…</option>
        {legacyValue && <option value="__legacy__" disabled>{card.background}</option>}
        {BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </select>
    );
  }

  if (field === "level") {
    return (
      <select
        data-f="level"
        data-testid="sheet-level"
        aria-label="Level"
        value={card.level}
        onChange={(event) => automation.chooseLevel(Number(event.target.value))}
        {...reasonProps(result.reasons.level)}
      >
        {Array.from({ length: 20 }, (_, index) => index + 1).map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    );
  }

  const subclasses = klass?.subclasses ?? [];
  const legacySubclass = !card.subclassId && typeof card.sheet?.subclass === "string" && card.sheet.subclass
    ? card.sheet.subclass
    : "";
  return (
    <select
      data-f="subclass"
      data-testid="sheet-subclass"
      aria-label="Subclass"
      value={card.subclassId ?? (legacySubclass ? "__legacy__" : "")}
      disabled={!klass || card.level < 3}
      data-empty={!card.subclassId || undefined}
      onChange={(event) => automation.chooseSubclass(event.target.value)}
      {...reasonProps(result.reasons.subclass)}
    >
      <option value="">{card.level < 3 ? "Available at level 3" : "Choose path…"}</option>
      {legacySubclass && <option value="__legacy__" disabled>{legacySubclass}</option>}
      {subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
    </select>
  );
}

export function PageOneAutomation() {
  const automation = useCharacterAutomation();
  if (automation.readOnly) return null;
  const {
    card,
    result,
    state,
    klass,
    background,
    base,
    bonuses,
    mode,
    pointsLeft,
    bonusUsed,
  } = automation;
  const pendingCount = Object.values(result.pending).filter(Boolean).length;
  const classRemaining = result.pending.classSkills?.remaining ?? 0;
  const featRemaining = Math.max(0, 3 - (card.featSkills?.length ?? 0));

  return (
    <AutoBlock
      title="Character choices"
      testId="sheet-character-automation"
      meta={(
        <span className={pendingCount > 0 ? "sheet-auto-count pending" : "sheet-auto-count"}>
          {pendingCount} {pendingCount === 1 ? "decision" : "decisions"}
        </span>
      )}
    >
      <p className="sheet-auto-note">
        Make choices here on the sheet. Gold-marked fields update from the cited rules.
      </p>

      <div className="sheet-auto-subsection">
        <div className="sheet-auto-subtitle">
          <h3>Ability scores</h3>
          <span className={pointsLeft === 0 ? "" : "pending"}>
            {pointsLeft === null
              ? "Invalid buy"
              : state.setupComplete
                ? `${pointsLeft} points unspent at creation`
                : `${pointsLeft} points left`}
          </span>
        </div>
        {state.setupComplete ? (
          <p className="sheet-auto-note">Creation scores are locked; level-up changes still update the sheet.</p>
        ) : (
          <>
            <label className="sheet-auto-field">
              Method
              <select value={mode} onChange={(event) => automation.switchMode(event.target.value as BuyMode)}>
                <option value="pointbuy">Standard point buy · 27</option>
                <option value="maduhausu">Maduhausu · 57</option>
              </select>
            </label>
            <div className="sheet-auto-abilities">
              {ABILITY_KEYS.map((key: AbilityKey) => {
                const min = mode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
                const max = mode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;
                const eligible = background?.abilityScores.includes(key) ?? false;
                return (
                  <div key={key}>
                    <b>{ABILITY_NAME[key]}</b>
                    <label>
                      Base
                      <select
                        aria-label={`${ABILITY_NAME[key]} base`}
                        value={base[key]}
                        onChange={(event) => automation.setBase(key, Number(event.target.value))}
                      >
                        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                    </label>
                    <label className={eligible ? "" : "disabled"}>
                      Background
                      <select
                        aria-label={`${ABILITY_NAME[key]} background bonus`}
                        disabled={!eligible}
                        value={bonuses[key] ?? 0}
                        onChange={(event) => automation.setBonus(key, Number(event.target.value))}
                      >
                        <option value={0}>+0</option>
                        <option value={1}>+1</option>
                        <option value={2}>+2</option>
                      </select>
                    </label>
                    <output aria-label={`${ABILITY_NAME[key]} final score`}>{card.abilities[key]}</output>
                  </div>
                );
              })}
            </div>
            <p className={bonusUsed === 3 ? "sheet-auto-note" : "sheet-auto-alert"}>
              {bonusUsed}/3 background points used
              {background ? ` · eligible: ${background.abilityScores.map((key) => key.toUpperCase()).join(", ")}` : " · choose a background above"}
            </p>
          </>
        )}
      </div>

      {klass && (
        <div className="sheet-auto-subsection">
          <div className="sheet-auto-subtitle">
            <h3>Class skills</h3>
            <Count remaining={classRemaining} />
          </div>
          <p className="sheet-auto-note">{klass.title} grants {klass.skillChoices.count} choices.</p>
          <CheckGrid values={klass.skillChoices.options} selected={state.classSkills} onToggle={automation.toggleClassSkill} />
        </div>
      )}

      {background?.feat === "Skilled" && (
        <div className="sheet-auto-subsection">
          <div className="sheet-auto-subtitle">
            <h3>Skilled proficiencies</h3>
            <Count remaining={featRemaining} />
          </div>
          <CheckGrid
            values={[...SKILLS.map((skill) => skill.name), ...TOOL_PROFICIENCIES]}
            selected={card.featSkills ?? []}
            onToggle={automation.toggleFeatSkill}
          />
        </div>
      )}

      <details className="sheet-auto-explanation">
        <summary>Why fields changed</summary>
        <p>Gold edges identify calculated values. Hover or focus one to see its source.</p>
        {(state.manualOverrides ?? []).map((key) => (
          <button type="button" key={key} onClick={() => automation.restoreCalculated(key)}>
            Restore calculated value for {key}
          </button>
        ))}
      </details>

      {!state.setupComplete && card.classId && card.backgroundId && (
        <button type="button" className="sheet-auto-finish" onClick={automation.finishSetup}>
          Finish character setup
        </button>
      )}
    </AutoBlock>
  );
}

export function ArmorAutomation() {
  const automation = useCharacterAutomation();
  if (automation.readOnly) return null;
  const { card, result, canChooseCreationGear } = automation;
  const addonLimit = maxAddonPieces(card.mainArmorId);
  return (
    <AutoBlock
      title="Choose armor"
      testId="sheet-armor-automation"
      meta={<span className="sheet-auto-total">AC {result.fields.ac}</span>}
    >
      {!canChooseCreationGear && (
        <p className="sheet-auto-alert">Setup is finished. Owned armor is now managed from inventory.</p>
      )}
      <fieldset className="sheet-auto-fieldset" disabled={!canChooseCreationGear}>
        <label className="sheet-auto-field">
          Main armor
          <select
            data-testid="sheet-main-armor"
            value={card.mainArmorId ?? ""}
            onChange={(event) => automation.chooseMainArmor(event.target.value)}
          >
            <option value="">Unarmored</option>
            {ARMOR.filter((entry) => entry.category === "Main Armor").map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name} · {entry.ac} · {entry.weightLb} lb</option>
            ))}
          </select>
        </label>
        <div className="sheet-auto-subtitle">
          <h3>Add-on armor</h3>
          <span>{(card.addonArmorIds ?? []).length}/{addonLimit}</span>
        </div>
        <CheckGrid
          values={ARMOR.filter((entry) => entry.category === "Add-on Armor").map((entry) => entry.name)}
          selected={(card.addonArmorIds ?? []).map((id) => ARMOR_BY_ID[id]?.name ?? id)}
          onToggle={(name) => {
            const id = ARMOR.find((entry) => entry.name === name)?.id;
            if (id) automation.toggleAddonArmor(id);
          }}
        />
        {(card.addonArmorIds ?? []).length > 0 && (
          <div className="sheet-auto-studs">
            <h3>Studs</h3>
            <CheckGrid
              values={(card.addonArmorIds ?? []).map((id) => ARMOR_BY_ID[id]?.name ?? id)}
              selected={(card.studdedAddonIds ?? []).map((id) => ARMOR_BY_ID[id]?.name ?? id)}
              onToggle={(name) => {
                const id = card.addonArmorIds?.find((entry) => (ARMOR_BY_ID[entry]?.name ?? entry) === name);
                if (id) automation.toggleStuds(id);
              }}
            />
          </div>
        )}
        <div className="sheet-auto-grid">
          {EXTRA_SUBCATEGORIES.map((subcategory) => (
            <label className="sheet-auto-field" key={subcategory}>
              {subcategory}
              <select
                value={(card.extraArmorIds ?? []).find((id) => ARMOR_BY_ID[id]?.subcategory === subcategory) ?? ""}
                onChange={(event) => automation.setExtra(subcategory, event.target.value)}
              >
                <option value="">None</option>
                {ARMOR.filter(
                  (entry) => entry.category === "Extra" && entry.subcategory === subcategory && !entry.unique,
                ).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.weightLb} lb</option>)}
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="sheet-auto-note">AC, armor category, worn pieces, and carried weight update below.</p>
    </AutoBlock>
  );
}

export function EquipmentAutomation() {
  const automation = useCharacterAutomation();
  const [itemId, setItemId] = useState("");
  if (automation.readOnly) return null;
  const { card, result, canChooseCreationGear } = automation;
  const equipment = ITEMS.filter((entry) => entry.category !== "Armor");
  return (
    <AutoBlock
      title="Choose equipment"
      testId="sheet-equipment-automation"
      meta={<span className="sheet-auto-total">{String(result.fields.weight ?? "0 lb")}</span>}
    >
      {!canChooseCreationGear && (
        <p className="sheet-auto-alert">Setup is finished. Equipment is now managed from inventory.</p>
      )}
      <fieldset className="sheet-auto-fieldset" disabled={!canChooseCreationGear}>
        <div className="sheet-auto-add">
          <select aria-label="Equipment catalog" value={itemId} onChange={(event) => setItemId(event.target.value)}>
            <option value="">Choose equipment…</option>
            {equipment.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name} · {entry.weightLb} lb</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!itemId}
            onClick={() => {
              if (itemId) automation.changeQty(itemId, 1);
              setItemId("");
            }}
          >
            Add
          </button>
        </div>
        <div className="sheet-auto-inventory">
          {(card.inventory ?? []).map((entry) => (
            <div key={entry.itemId}>
              <span>{ITEM_BY_ID[entry.itemId]?.name ?? entry.itemId}</span>
              <small>{ITEM_BY_ID[entry.itemId]?.weightLb ?? 0} lb each</small>
              <div>
                <button type="button" aria-label={`Remove ${ITEM_BY_ID[entry.itemId]?.name ?? entry.itemId}`} onClick={() => automation.changeQty(entry.itemId, -1)}>−</button>
                <b>{entry.qty}</b>
                <button type="button" aria-label={`Add ${ITEM_BY_ID[entry.itemId]?.name ?? entry.itemId}`} onClick={() => automation.changeQty(entry.itemId, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <p className="sheet-auto-note">
        Carrying: {String(result.fields.weightCondition ?? "Normal")}. The table below fills automatically.
      </p>
    </AutoBlock>
  );
}

export function ClassChoiceAutomation() {
  const automation = useCharacterAutomation();
  if (automation.readOnly) return null;
  const { card, state, expertiseLimit, masteryCount, masteryFeature, masteryWeapons, result } = automation;
  const levelChoices = result.pending.levelChoices;
  if (!expertiseLimit && !masteryCount && !levelChoices) return null;
  return (
    <AutoBlock title="Class choices" testId="sheet-class-choice-automation">
      {expertiseLimit > 0 && (
        <div className="sheet-auto-subsection">
          <div className="sheet-auto-subtitle"><h3>Expertise</h3><Count remaining={Math.max(0, expertiseLimit - (state.expertiseSkills?.length ?? 0))} /></div>
          <CheckGrid values={card.skillProficiencies} selected={state.expertiseSkills ?? []} onToggle={automation.toggleExpertise} />
        </div>
      )}
      {masteryCount > 0 && (
        <div className="sheet-auto-subsection">
          <div className="sheet-auto-subtitle"><h3>Weapon Mastery</h3><Count remaining={Math.max(0, masteryCount - (state.weaponMasteries?.length ?? 0))} /></div>
          <p className="sheet-auto-note">{masteryFeature?.text.split(". ")[0]}.</p>
          <CheckGrid values={masteryWeapons.map((item) => item.name)} selected={state.weaponMasteries ?? []} onToggle={automation.toggleMastery} />
        </div>
      )}
      {levelChoices && (
        <div className="sheet-auto-subsection">
          <h3>Level-up decisions</h3>
          <p className="sheet-auto-alert">{levelChoices.reason}</p>
          <ul>{levelChoices.options?.map((choice) => <li key={choice}>{choice}</li>)}</ul>
        </div>
      )}
    </AutoBlock>
  );
}

export function WhisperAutomation() {
  const automation = useCharacterAutomation();
  if (automation.readOnly || automation.whisperLimit <= 0) return null;
  const selected = automation.card.preparedWhispers ?? [];
  return (
    <AutoBlock
      title="Prepared Whispers"
      testId="sheet-whisper-automation"
      meta={<Count remaining={Math.max(0, automation.whisperLimit - selected.length)} />}
    >
      <p className="sheet-auto-note">Your class level and Listener feat determine how many you may prepare.</p>
      <CheckGrid
        values={WHISPERS.map((whisper) => whisper.name)}
        selected={selected.map((id) => WHISPERS.find((whisper) => whisper.id === id)?.name ?? id)}
        onToggle={(name) => {
          const id = WHISPERS.find((whisper) => whisper.name === name)?.id;
          if (id) automation.toggleWhisper(id);
        }}
      />
    </AutoBlock>
  );
}
