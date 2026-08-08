import { useState, type ReactNode } from "react";
import { ABILITY_NAME, MADUHAUSU_MAX, MADUHAUSU_MIN, POINT_BUY_MAX, POINT_BUY_MIN } from "@/data/abilities";
import { ARMOR, ARMOR_BY_ID } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { TOOL_PROFICIENCIES, WHISPERS } from "@/data/characterOptions";
import { ITEMS } from "@/data/items";
import { SKILL_BY_NAME, SKILLS } from "@/data/skills";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { maxAddonPieces } from "@/lib/character";
import { armorFor, itemFor } from "@/lib/customItems";
import type { AbilityKey, CarrySignificance, HunterCard } from "@/types";
import { BackgroundDetails } from "../BackgroundDetails";
import type { BuyMode } from "../../lib/abilityBuy";
import { Chk, F, Sel, Ta } from "./sheetPrimitives";
import { useCharacterAutomation } from "./characterAutomationContext";

type ExtraSubcategory = "Head Gear" | "Scarf" | "Gloves" | "Boots";

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

function choiceAbility(choice: string) {
  const skill = SKILL_BY_NAME[choice];
  return skill ? `Ability: ${ABILITY_NAME[skill.ability]}` : "No ability required";
}

function CheckGrid({
  values,
  selected,
  onToggle,
  meta,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  meta?: (value: string) => string | undefined;
}) {
  return (
    <div className="sheet-auto-checks">
      {values.map((value) => (
        <label key={value}>
          <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
          <span><b>{value}</b>{meta?.(value) && <small>{meta(value)}</small>}</span>
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

      <BackgroundDetails background={background} className="sheet-background-details" />

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
        {state.setupComplete && card.level > 1 ? (
          <p className="sheet-auto-note">Creation scores lock at level 2; level-up changes still update the sheet.</p>
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
          <CheckGrid values={klass.skillChoices.options} selected={state.classSkills} onToggle={automation.toggleClassSkill} meta={choiceAbility} />
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
            meta={choiceAbility}
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

function armorCatalog(card: HunterCard) {
  const customArmor = (card.customItems ?? []).filter((item) => item.category === "Armor");
  return {
    main: [
      ...ARMOR.filter((entry) => entry.category === "Main Armor"),
      ...customArmor.filter((entry) => entry.armorCategory === "Main Armor").map((entry) => armorFor(card, entry.id)!),
    ],
    addons: [
      ...ARMOR.filter((entry) => entry.category === "Add-on Armor"),
      ...customArmor.filter((entry) => entry.armorCategory === "Add-on Armor").map((entry) => armorFor(card, entry.id)!),
    ],
  };
}

/** Rules-aware armor controls that live in the original paper fields. */
export function AutomatedMainArmorField() {
  const automation = useCharacterAutomation();
  if (automation.readOnly) return <Ta rows={3} f="mainArmor" />;
  const options = armorCatalog(automation.card).main;
  return (
    <select
      data-f="mainArmor"
      data-testid="sheet-main-armor"
      aria-label="Main armor"
      value={automation.card.mainArmorId ?? ""}
      data-empty={!automation.card.mainArmorId || undefined}
      data-automated={automation.card.mainArmorId ? "true" : undefined}
      data-auto-reason={automation.card.mainArmorId ? "Armor selection calculates AC, category, weight, and worn armor fields" : undefined}
      onChange={(event) => automation.chooseMainArmor(event.target.value)}
      title="This choice calculates Armor Class, category, weight, and the written armor fields."
    >
      <option value="">Unarmored</option>
      {options.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {entry.name}{entry.unique ? " · Unique" : ""} · {entry.ac} · {entry.weightLb} lb
        </option>
      ))}
    </select>
  );
}

export function AutomatedExtraArmorField({
  subcategory,
  field,
}: {
  subcategory: ExtraSubcategory;
  field: "headGear" | "scarf" | "gloves" | "boots";
}) {
  const automation = useCharacterAutomation();
  if (automation.readOnly) return <F f={field} />;
  const selected = (automation.card.extraArmorIds ?? []).find(
    (id) => ARMOR_BY_ID[id]?.subcategory === subcategory,
  ) ?? "";
  return (
    <select
      data-f={field}
      aria-label={subcategory}
      value={selected}
      data-empty={!selected || undefined}
      data-automated={selected ? "true" : undefined}
      data-auto-reason={selected ? "Worn armor extra updates this field and carried weight" : undefined}
      onChange={(event) => automation.setExtra(subcategory, event.target.value)}
      title="This worn item updates the paper field and carried weight."
    >
      <option value="">None</option>
      {ARMOR.filter(
        (entry) => entry.category === "Extra" && entry.subcategory === subcategory && !entry.unique,
      ).map((entry) => (
        <option key={entry.id} value={entry.id}>{entry.name} · {entry.weightLb} lb</option>
      ))}
    </select>
  );
}

export function AutomatedAddonArmorRow({ index }: { index: number }) {
  const automation = useCharacterAutomation();
  if (automation.readOnly) {
    return (
      <>
        <div className="frame"><F f={`addon${index + 1}`} /></div>
        <span className="studs"><Chk f={`studs${index + 1}`} /> STUDS</span>
      </>
    );
  }
  const { card } = automation;
  const selectedId = card.addonArmorIds?.[index] ?? "";
  const limit = maxAddonPieces(card.mainArmorId, card.customItems);
  const beyondArmorLimit = index >= limit;
  const waitingForPrevious = index > (card.addonArmorIds ?? []).length;
  const disabled = beyondArmorLimit || waitingForPrevious;
  const options = armorCatalog(card).addons;
  const wornElsewhere = new Set(
    (card.addonArmorIds ?? []).filter((_, selectedIndex) => selectedIndex !== index),
  );
  return (
    <>
      <div className="frame">
        <select
          data-f={`addon${index + 1}`}
          data-testid={`sheet-addon-armor-${index + 1}`}
          aria-label={`Add-on armor ${index + 1}`}
          value={selectedId}
          disabled={disabled}
          data-empty={!selectedId || undefined}
          data-automated={selectedId ? "true" : undefined}
          data-auto-reason={selectedId ? "Add-on selection calculates AC, weight, special rules, and this armor row" : undefined}
          onChange={(event) => automation.setAddonArmorAt(index, event.target.value)}
        >
          <option value="">
            {beyondArmorLimit ? "Balanced Fit slot" : waitingForPrevious ? "—" : "Choose add-on…"}
          </option>
          {options.map((entry) => (
            <option key={entry.id} value={entry.id} disabled={wornElsewhere.has(entry.id)}>
              {entry.name}{entry.unique ? " · Unique" : ""} · {entry.ac} · {entry.weightLb} lb
            </option>
          ))}
        </select>
      </div>
      <label className="studs">
        <input
          type="checkbox"
          aria-label={`Studs for add-on armor ${index + 1}`}
          checked={!!selectedId && (card.studdedAddonIds ?? []).includes(selectedId)}
          disabled={!selectedId || disabled}
          onChange={() => selectedId && automation.toggleStuds(selectedId)}
        />
        STUDS
      </label>
    </>
  );
}

/** The one screen-only extension to the legacy armor area: recording armor
 * found outside the handbook. Once saved, it appears in the paper fields. */
export function UniqueArmorControl() {
  const automation = useCharacterAutomation();
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({
    name: "",
    armorCategory: "Main Armor" as "Main Armor" | "Add-on Armor",
    acValue: 10,
    weightLb: 0,
    note: "",
  });
  if (automation.readOnly) return null;
  const { card } = automation;
  const addonLimit = maxAddonPieces(card.mainArmorId, card.customItems);
  const customAddonFull = custom.armorCategory === "Add-on Armor"
    && (card.addonArmorIds ?? []).length >= addonLimit;
  return (
    <div className="armor-discovery" data-testid="sheet-armor-automation">
      <button type="button" className="sheet-auto-custom-toggle" onClick={() => setShowCustom((open) => !open)}>
        {showCustom ? "Cancel unique armor" : "Add unique armor found in play"}
      </button>
      {showCustom && (
        <form
          className="sheet-auto-custom"
          data-testid="unique-armor-form"
          onSubmit={(event) => {
            event.preventDefault();
            automation.addCustomArmor(custom);
            setCustom({ name: "", armorCategory: "Main Armor", acValue: 10, weightLb: 0, note: "" });
            setShowCustom(false);
          }}
        >
          <p className="sheet-auto-note">Record the values the DM gave the item. It will be equipped in the armor fields above.</p>
          <div className="sheet-auto-grid">
            <label className="sheet-auto-field">Unique armor name<input aria-label="Unique armor name" required value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} /></label>
            <label className="sheet-auto-field">Armor type<select aria-label="Unique armor type" value={custom.armorCategory} onChange={(event) => setCustom({ ...custom, armorCategory: event.target.value as typeof custom.armorCategory, acValue: event.target.value === "Main Armor" ? 10 : 0 })}><option>Main Armor</option><option>Add-on Armor</option></select></label>
            <label className="sheet-auto-field">{custom.armorCategory === "Main Armor" ? "Base AC" : "AC bonus"}<input aria-label="Unique armor AC" type="number" min="0" max="30" required value={custom.acValue} onChange={(event) => setCustom({ ...custom, acValue: Number(event.target.value) })} /></label>
            <label className="sheet-auto-field">Weight (lb)<input aria-label="Unique armor weight" type="number" min="0" step="0.1" required value={custom.weightLb} onChange={(event) => setCustom({ ...custom, weightLb: Number(event.target.value) })} /></label>
          </div>
          <label className="sheet-auto-field">Special rule or note<textarea aria-label="Unique armor note" value={custom.note} onChange={(event) => setCustom({ ...custom, note: event.target.value })} /></label>
          {customAddonFull && <p className="sheet-auto-alert">All add-on slots are full. Remove one worn piece above first.</p>}
          <button type="submit" disabled={customAddonFull}>Add and equip unique armor</button>
        </form>
      )}
    </div>
  );
}

export function EquipmentAutomation() {
  const automation = useCharacterAutomation();
  const [itemId, setItemId] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({
    name: "",
    category: "Weapon" as "Weapon" | "Gear",
    carry: "Significant" as CarrySignificance,
    weightLb: 0,
    note: "",
    attackBonus: "",
    damage: "",
    weaponNotes: "",
  });
  if (automation.readOnly) return null;
  const { card, result } = automation;
  const equipment = ITEMS.filter((entry) => entry.category !== "Armor");
  return (
    <AutoBlock
      title="Choose equipment"
      testId="sheet-equipment-automation"
      meta={<span className="sheet-auto-total">{String(result.fields.weight ?? "0 lb")}</span>}
    >
      <fieldset className="sheet-auto-fieldset">
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
              <span>{itemFor(card, entry.itemId)?.name ?? entry.itemId}{itemFor(card, entry.itemId)?.unique ? " · Unique" : ""}</span>
              <small>{itemFor(card, entry.itemId)?.weightLb ?? 0} lb each</small>
              <div>
                <button type="button" aria-label={`Remove ${itemFor(card, entry.itemId)?.name ?? entry.itemId}`} onClick={() => automation.changeQty(entry.itemId, -1)}>−</button>
                <b>{entry.qty}</b>
                <button type="button" aria-label={`Add ${itemFor(card, entry.itemId)?.name ?? entry.itemId}`} onClick={() => automation.changeQty(entry.itemId, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <p className="sheet-auto-note">
        Carrying: {String(result.fields.weightCondition ?? "Normal")}. The table below fills automatically.
      </p>
      <button type="button" className="sheet-auto-custom-toggle" onClick={() => setShowCustom((open) => !open)}>
        {showCustom ? "Cancel unique item" : "Add unique weapon or item found in play"}
      </button>
      {showCustom && (
        <form
          className="sheet-auto-custom"
          data-testid="unique-item-form"
          onSubmit={(event) => {
            event.preventDefault();
            automation.addCustomItem(custom);
            setCustom({ name: "", category: "Weapon", carry: "Significant", weightLb: 0, note: "", attackBonus: "", damage: "", weaponNotes: "" });
            setShowCustom(false);
          }}
        >
          <p className="sheet-auto-note">Use the values supplied when the item was found; handbook catalog data is not required.</p>
          <div className="sheet-auto-grid">
            <label className="sheet-auto-field">Unique item name<input aria-label="Unique item name" required value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} /></label>
            <label className="sheet-auto-field">Item type<select aria-label="Unique item type" value={custom.category} onChange={(event) => setCustom({ ...custom, category: event.target.value as typeof custom.category })}><option>Weapon</option><option>Gear</option></select></label>
            <label className="sheet-auto-field">Carrying category<select aria-label="Unique item carrying category" value={custom.carry} onChange={(event) => setCustom({ ...custom, carry: event.target.value as CarrySignificance })}><option>Insignificant</option><option>Significant</option><option>Oversized</option></select></label>
            <label className="sheet-auto-field">Weight (lb)<input aria-label="Unique item weight" type="number" min="0" step="0.1" required value={custom.weightLb} onChange={(event) => setCustom({ ...custom, weightLb: Number(event.target.value) })} /></label>
          </div>
          {custom.category === "Weapon" && (
            <div className="sheet-auto-grid">
              <label className="sheet-auto-field">Attack bonus<input aria-label="Unique weapon attack bonus" value={custom.attackBonus} onChange={(event) => setCustom({ ...custom, attackBonus: event.target.value })} /></label>
              <label className="sheet-auto-field">Damage / type<input aria-label="Unique weapon damage" value={custom.damage} onChange={(event) => setCustom({ ...custom, damage: event.target.value })} /></label>
            </div>
          )}
          <label className="sheet-auto-field">Special rule or note<textarea aria-label="Unique item note" value={custom.note} onChange={(event) => setCustom({ ...custom, note: event.target.value, weaponNotes: event.target.value })} /></label>
          <button type="submit">Add unique item</button>
        </form>
      )}
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
          <CheckGrid values={card.skillProficiencies} selected={state.expertiseSkills ?? []} onToggle={automation.toggleExpertise} meta={choiceAbility} />
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
