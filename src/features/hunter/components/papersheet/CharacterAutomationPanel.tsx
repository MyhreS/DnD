import { useMemo, useState } from "react";
import { ABILITY_NAME, MADUHAUSU_FINAL_MAX, MADUHAUSU_MAX, MADUHAUSU_MIN, POINT_BUY_MAX, POINT_BUY_MIN } from "@/data/abilities";
import { ARMOR, ARMOR_BY_ID } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES, getClass } from "@/data/classes";
import { TOOL_PROFICIENCIES, WHISPERS } from "@/data/characterOptions";
import { ITEMS, ITEM_BY_ID } from "@/data/items";
import { SKILLS } from "@/data/skills";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";
import { startingKit } from "@/lib/startingEquipment";
import { budgetFor, spentFor, type BuyMode } from "../../lib/abilityBuy";
import { automationFor } from "../../lib/characterAutomation";
import type { AbilityKey, HunterCard, InventoryEntry, SheetAutomationState, SheetData } from "@/types";

type Apply = (fields: SheetData, patch: Partial<HunterCard>) => void;

const ZERO_BONUS = (): Partial<Record<AbilityKey, number>> => Object.fromEntries(
  ABILITY_KEYS.map((key) => [key, 0]),
) as Partial<Record<AbilityKey, number>>;
const EXTRA_SUBCATEGORIES = ["Head Gear", "Scarf", "Gloves", "Boots"] as const;

function mergeInventory(base: InventoryEntry[], additions: InventoryEntry[]): InventoryEntry[] {
  const counts = new Map(base.map((entry) => [entry.itemId, entry.qty]));
  for (const entry of additions) counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + entry.qty);
  return [...counts].filter(([, qty]) => qty > 0).map(([itemId, qty]) => ({ itemId, qty }));
}

function removeInventory(base: InventoryEntry[], removals: InventoryEntry[]): InventoryEntry[] {
  return mergeInventory(base, removals.map((entry) => ({ ...entry, qty: -entry.qty })));
}

function withStartingKit(card: HunterCard): HunterCard {
  const state = card.sheetAutomation;
  const withoutOld = removeInventory(card.inventory ?? [], state?.startingKitInventory ?? []);
  const oldCoins = state?.startingKitCoins ?? 0;
  const kit = startingKit(getClass(card.classId), BACKGROUNDS.find((entry) => entry.id === card.backgroundId));
  if (!card.classId || !card.backgroundId) {
    return {
      ...card,
      inventory: withoutOld,
      coins: Math.max(0, (card.coins ?? 0) - oldCoins),
      sheetAutomation: { ...state!, startingKitApplied: false, startingKitInventory: [], startingKitCoins: 0 },
    };
  }
  return {
    ...card,
    inventory: mergeInventory(withoutOld, kit.inventory),
    coins: Math.max(0, (card.coins ?? 0) - oldCoins) + kit.coins,
    sheetAutomation: {
      ...state!,
      startingKitApplied: true,
      startingKitInventory: kit.inventory,
      startingKitCoins: kit.coins,
      legacyEquipment: [
        ...(state?.legacyEquipment ?? []),
        ...kit.unmatched.map((name) => ({ name, carrying: "Needs catalog data", slot: "—", weight: "—" })),
      ],
    },
  };
}

function normalizedAutomation(card: HunterCard): SheetAutomationState {
  if (card.sheetAutomation) return card.sheetAutomation;
  const klass = getClass(card.classId);
  const background = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const backgroundSkills = new Set(background?.skills ?? []);
  const classSkills = card.skillProficiencies.filter(
    (skill) => !backgroundSkills.has(skill) && (klass?.skillChoices.options.includes(skill) ?? false),
  );
  const backgroundBonuses = Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, Math.max(0, card.abilities[key] - (card.baseAbilities?.[key] ?? card.abilities[key]))]),
  ) as Partial<Record<AbilityKey, number>>;
  const existingWrittenSheet = !!card.sheet && Object.values(card.sheet).some((value) => value === true || (typeof value === "string" && value.trim() !== ""));
  return { version: 1, classSkills, backgroundBonuses, setupComplete: existingWrittenSheet };
}

function finalAbilities(card: HunterCard, bonuses: Partial<Record<AbilityKey, number>>) {
  const base = card.baseAbilities ?? card.abilities;
  return Object.fromEntries(ABILITY_KEYS.map((key) => [key, base[key] + (bonuses[key] ?? 0)])) as HunterCard["abilities"];
}

function automatedFields(card: HunterCard): SheetData {
  const result = automationFor(card);
  const overrides = new Set(card.sheetAutomation?.manualOverrides ?? []);
  return Object.fromEntries(Object.entries(result.fields).filter(([key]) => !overrides.has(key)));
}

export function CharacterAutomationPanel({ card, onApply, onClose }: { card: HunterCard; onApply: Apply; onClose: () => void }) {
  const [itemId, setItemId] = useState("");
  const result = useMemo(() => automationFor(card), [card]);
  const state = normalizedAutomation(card);
  const klass = getClass(card.classId);
  const background = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const base = card.baseAbilities ?? card.abilities;
  const bonuses = state.backgroundBonuses;
  const mode: BuyMode = card.abilityMode ?? "pointbuy";
  const spent = spentFor(mode, base);
  const pointsLeft = spent === null ? null : budgetFor(mode) - spent;
  const bonusUsed = ABILITY_KEYS.reduce((sum, key) => sum + (bonuses[key] ?? 0), 0);
  const pending = Object.values(result.pending).filter(Boolean);
  const equipment = ITEMS.filter((entry) => entry.category !== "Armor");
  const canChooseCreationGear = state.setupComplete !== true;
  const expertiseLimit = klass
    ? klass.progression.filter((row) => row.level <= card.level && /(^|,\s*)Expertise(,|$)/i.test(row.features)).length * 2
      + (klass.id === "warden" && card.level >= 9 ? 2 : 0)
    : 0;
  const masteryFeature = klass?.features?.find((feature) => feature.name === "Weapon Mastery" && feature.level <= card.level);
  const masteryWord = masteryFeature?.text.match(/mastery properties of (two|three|four|five|six)/i)?.[1]?.toLowerCase();
  const masteryFromTable = Number(klass?.progression.find((row) => row.level === card.level)?.extras["Weapon Mastery"] ?? 0);
  const masteryCount = masteryFromTable || (masteryWord ? ({ two: 2, three: 3, four: 4, five: 5, six: 6 }[masteryWord] ?? 0) : 0);
  const meleeWeaponIds = new Set(["greatsword", "greataxe", "longsword", "shortsword", "scimitar", "hunter-cleaver", "sickle", "handaxe", "dagger"]);
  const finesseOrLightIds = new Set(["shortsword", "scimitar", "sickle", "handaxe", "dagger", "pistol"]);
  const masteryWeapons = ITEMS.filter((item) => {
    if (item.category !== "Weapon") return false;
    if (klass?.id === "stalker") return finesseOrLightIds.has(item.id);
    if (/Melee weapons/i.test(masteryFeature?.text ?? "")) return meleeWeaponIds.has(item.id);
    return true;
  });
  const whisperLimit = (klass?.caster ? Number(klass.progression.find((row) => row.level === card.level)?.extras["Prepared Whispers"] ?? 0) : 0)
    + (background?.feat === "Listener" ? 1 : 0);

  function commit(partial: Partial<HunterCard>, refreshKit = false) {
    let next: HunterCard = {
      ...card,
      ...partial,
      sheetAutomation: { ...state, ...(partial.sheetAutomation ?? {}) },
    };
    if (refreshKit) next = withStartingKit(next);
    const patch: Partial<HunterCard> = { ...partial, sheetAutomation: next.sheetAutomation };
    if (refreshKit) {
      patch.inventory = next.inventory;
      patch.coins = next.coins;
    }
    onApply(automatedFields(next), patch);
  }

  function chooseClass(classId: string) {
    const nextClass = getClass(classId);
    const classSkills = state.classSkills.filter((skill) => nextClass?.skillChoices.options.includes(skill));
    const granted = background?.skills ?? [];
    commit({
      classId,
      level: card.classId ? card.level : 1,
      lastSeenLevel: card.classId ? card.lastSeenLevel : 0,
      subclassId: null,
      skillProficiencies: [...new Set([...classSkills, ...granted])],
      sheetAutomation: { ...state, classSkills },
    }, true);
  }

  function chooseBackground(backgroundId: string) {
    const nextBackground = BACKGROUNDS.find((entry) => entry.id === backgroundId);
    const nextBonuses = backgroundId === card.backgroundId ? bonuses : ZERO_BONUS();
    const classSkills = state.classSkills;
    commit({
      backgroundId,
      background: nextBackground?.name ?? "",
      feat: nextBackground?.feat ?? null,
      featSkills: nextBackground?.feat === "Skilled" ? card.featSkills ?? [] : [],
      skillProficiencies: [...new Set([...classSkills, ...(nextBackground?.skills ?? [])])],
      abilities: finalAbilities(card, nextBonuses),
      sheetAutomation: { ...state, backgroundBonuses: nextBonuses },
    }, true);
  }

  function toggleClassSkill(skill: string) {
    if (!klass) return;
    const selected = state.classSkills;
    const classSkills = selected.includes(skill)
      ? selected.filter((entry) => entry !== skill)
      : selected.length < klass.skillChoices.count ? [...selected, skill] : selected;
    commit({
      skillProficiencies: [...new Set([...classSkills, ...(background?.skills ?? [])])],
      sheetAutomation: { ...state, classSkills },
    });
  }

  function toggleFeatSkill(choice: string) {
    const selected = card.featSkills ?? [];
    const featSkills = selected.includes(choice)
      ? selected.filter((entry) => entry !== choice)
      : selected.length < 3 ? [...selected, choice] : selected;
    const skillPicks = featSkills.filter((entry) => SKILLS.some((skill) => skill.name === entry));
    commit({ featSkills, skillProficiencies: [...new Set([...state.classSkills, ...(background?.skills ?? []), ...skillPicks])] });
  }

  function toggleExpertise(skill: string) {
    const selected = state.expertiseSkills ?? [];
    const expertiseSkills = selected.includes(skill)
      ? selected.filter((entry) => entry !== skill)
      : selected.length < expertiseLimit ? [...selected, skill] : selected;
    commit({ sheetAutomation: { ...state, expertiseSkills } });
  }

  function toggleMastery(weapon: string) {
    const selected = state.weaponMasteries ?? [];
    const weaponMasteries = selected.includes(weapon)
      ? selected.filter((entry) => entry !== weapon)
      : selected.length < masteryCount ? [...selected, weapon] : selected;
    commit({ sheetAutomation: { ...state, weaponMasteries } });
  }

  function toggleWhisper(id: string) {
    const selected = card.preparedWhispers ?? [];
    const preparedWhispers = selected.includes(id)
      ? selected.filter((entry) => entry !== id)
      : selected.length < whisperLimit ? [...selected, id] : selected;
    commit({ preparedWhispers });
  }

  function setBase(key: AbilityKey, value: number) {
    const nextBase = { ...base, [key]: value };
    if (mode === "maduhausu" && value + (bonuses[key] ?? 0) > MADUHAUSU_FINAL_MAX) return;
    const nextSpent = spentFor(mode, nextBase);
    if (nextSpent === null || nextSpent > budgetFor(mode)) return;
    commit({ baseAbilities: nextBase, abilities: finalAbilities({ ...card, baseAbilities: nextBase }, bonuses) });
  }

  function setBonus(key: AbilityKey, value: number) {
    if (!background?.abilityScores.includes(key)) return;
    const nextBonuses = { ...bonuses, [key]: value };
    const nextTotal = ABILITY_KEYS.reduce((sum, ability) => sum + (nextBonuses[ability] ?? 0), 0);
    if (nextTotal > 3 || base[key] + value > 20 || (mode === "maduhausu" && base[key] + value > MADUHAUSU_FINAL_MAX)) return;
    commit({ abilities: finalAbilities(card, nextBonuses), sheetAutomation: { ...state, backgroundBonuses: nextBonuses } });
  }

  function switchMode(nextMode: BuyMode) {
    if (nextMode === mode) return;
    const min = nextMode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
    const max = nextMode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;
    const nextBase = Object.fromEntries(ABILITY_KEYS.map((key) => [key, Math.max(min, Math.min(max, base[key]))])) as HunterCard["abilities"];
    commit({ abilityMode: nextMode, baseAbilities: nextBase, abilities: finalAbilities({ ...card, baseAbilities: nextBase }, bonuses) });
  }

  function changeQty(id: string, delta: number) {
    if (!canChooseCreationGear) return;
    const inventory = mergeInventory(card.inventory ?? [], [{ itemId: id, qty: delta }]);
    commit({ inventory });
  }

  function setExtra(subcategory: string, id: string) {
    if (!canChooseCreationGear) return;
    const kept = (card.extraArmorIds ?? []).filter((entry) => ARMOR_BY_ID[entry]?.subcategory !== subcategory);
    commit({ extraArmorIds: id ? [...kept, id] : kept });
  }

  function restoreCalculated(key: string) {
    const manualOverrides = (state.manualOverrides ?? []).filter((entry) => entry !== key);
    const next = { ...card, sheetAutomation: { ...state, manualOverrides } };
    const value = automationFor(next).fields[key];
    if (value !== undefined) onApply({ [key]: value }, { sheetAutomation: next.sheetAutomation });
  }

  return (
    <aside className="automation-panel" aria-label="Character builder" data-testid="character-automation-panel">
      <header className="automation-head">
        <div><p className="automation-kicker">RULES ASSISTANT</p><h2>Build your hunter</h2></div>
        <button type="button" className="automation-close" onClick={onClose} aria-label="Close builder">×</button>
      </header>
      <p className="automation-intro">Choose the decisions. The sheet calculates and cites everything else.</p>

      <section className="automation-section">
        <h3>Identity</h3>
        <label>Class<select data-testid="automation-class" value={card.classId} onChange={(event) => chooseClass(event.target.value)}><option value="">Choose class…</option>{CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
        <div className="automation-grid2">
          <label>Level<select data-testid="automation-level" value={card.level} onChange={(event) => commit({ level: Number(event.target.value) })}>{Array.from({ length: 20 }, (_, index) => index + 1).map((level) => <option key={level}>{level}</option>)}</select></label>
          {klass && card.level >= 3 && <label>Path<select data-testid="automation-subclass" value={card.subclassId ?? ""} onChange={(event) => commit({ subclassId: event.target.value || null })}><option value="">Choose path…</option>{klass.subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}
        </div>
        <label>Background<select data-testid="automation-background" value={card.backgroundId ?? ""} onChange={(event) => chooseBackground(event.target.value)}><option value="">Choose background…</option>{BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      </section>

      {klass && <section className="automation-section"><div className="automation-titleline"><h3>Class skills</h3><span className={result.pending.classSkills ? "automation-count pending" : "automation-count"}>{result.pending.classSkills?.remaining ?? 0} left</span></div><p className="automation-source">{klass.title} grants {klass.skillChoices.count} choices.</p><div className="automation-checks">{klass.skillChoices.options.map((skill) => <label key={skill}><input type="checkbox" checked={state.classSkills.includes(skill)} onChange={() => toggleClassSkill(skill)} />{skill}</label>)}</div></section>}

      {background?.feat === "Skilled" && <section className="automation-section"><div className="automation-titleline"><h3>Skilled proficiencies</h3><span className={(card.featSkills?.length ?? 0) === 3 ? "automation-count" : "automation-count pending"}>{Math.max(0, 3 - (card.featSkills?.length ?? 0))} left</span></div><p className="automation-source">The Skilled origin feat grants any three skills or tools.</p><div className="automation-checks">{[...SKILLS.map((skill) => skill.name), ...TOOL_PROFICIENCIES].map((choice) => <label key={choice}><input type="checkbox" checked={(card.featSkills ?? []).includes(choice)} onChange={() => toggleFeatSkill(choice)} />{choice}</label>)}</div></section>}

      {expertiseLimit > 0 && <section className="automation-section"><div className="automation-titleline"><h3>Expertise</h3><span className={(state.expertiseSkills?.length ?? 0) >= expertiseLimit ? "automation-count" : "automation-count pending"}>{Math.max(0, expertiseLimit - (state.expertiseSkills?.length ?? 0))} left</span></div><p className="automation-source">Expertise adds twice your proficiency bonus to selected proficient skills.</p><div className="automation-checks">{card.skillProficiencies.map((skill) => <label key={skill}><input type="checkbox" checked={(state.expertiseSkills ?? []).includes(skill)} onChange={() => toggleExpertise(skill)} />{skill}</label>)}</div></section>}

      {masteryCount > 0 && <section className="automation-section"><div className="automation-titleline"><h3>Weapon Mastery</h3><span className={(state.weaponMasteries?.length ?? 0) >= masteryCount ? "automation-count" : "automation-count pending"}>{Math.max(0, masteryCount - (state.weaponMasteries?.length ?? 0))} left</span></div><p className="automation-source">{masteryFeature?.text.split(". ")[0]}.</p><div className="automation-checks">{masteryWeapons.map((item) => <label key={item.id}><input type="checkbox" checked={(state.weaponMasteries ?? []).includes(item.name)} onChange={() => toggleMastery(item.name)} />{item.name}</label>)}</div></section>}

      {whisperLimit > 0 && <section className="automation-section"><div className="automation-titleline"><h3>Prepared Whispers</h3><span className={(card.preparedWhispers?.length ?? 0) >= whisperLimit ? "automation-count" : "automation-count pending"}>{Math.max(0, whisperLimit - (card.preparedWhispers?.length ?? 0))} left</span></div><p className="automation-source">Your class progression and Listener feat determine this limit.</p><div className="automation-checks">{WHISPERS.map((whisper) => <label key={whisper.id}><input type="checkbox" checked={(card.preparedWhispers ?? []).includes(whisper.id)} onChange={() => toggleWhisper(whisper.id)} />{whisper.name}</label>)}</div></section>}

      <section className="automation-section">
        <div className="automation-titleline"><h3>Ability scores</h3><span className={pointsLeft === 0 ? "automation-count" : "automation-count pending"}>{pointsLeft === null ? "Invalid buy" : `${pointsLeft} points left`}</span></div>
        {state.setupComplete && <p className="automation-warning">Creation scores are locked. Level-up choices remain listed below; direct edits on the paper sheet are kept as your manual values.</p>}
        <fieldset className="automation-fieldset" disabled={state.setupComplete}>
        <label>Method<select value={mode} onChange={(event) => switchMode(event.target.value as BuyMode)}><option value="pointbuy">Standard point buy · 27</option><option value="maduhausu">Maduhausu · 57</option></select></label>
        <div className="automation-abilities">{ABILITY_KEYS.map((key) => {
          const min = mode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
          const max = mode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;
          const eligible = background?.abilityScores.includes(key) ?? false;
          return <div key={key} className="automation-ability"><b>{ABILITY_NAME[key]}</b><label>Base<select aria-label={`${ABILITY_NAME[key]} base`} value={base[key]} onChange={(event) => setBase(key, Number(event.target.value))}>{Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => <option key={score}>{score}</option>)}</select></label><label className={!eligible ? "disabled" : ""}>Background<select aria-label={`${ABILITY_NAME[key]} background bonus`} disabled={!eligible} value={bonuses[key] ?? 0} onChange={(event) => setBonus(key, Number(event.target.value))}><option value={0}>+0</option><option value={1}>+1</option><option value={2}>+2</option></select></label><output>{card.abilities[key]}</output></div>;
        })}</div>
        <p className={bonusUsed === 3 ? "automation-source" : "automation-warning"}>{bonusUsed}/3 background points used{background ? ` · eligible: ${background.abilityScores.map((key) => key.toUpperCase()).join(", ")}` : " · choose a background"}</p>
        </fieldset>
      </section>

      <section className="automation-section">
        <div className="automation-titleline"><h3>Armor</h3><span className="automation-count">AC {result.fields.ac}</span></div>
        {!canChooseCreationGear && <p className="automation-warning">Creation is finished. Wear or remove owned armor from the inventory sheet so equipment cannot be duplicated.</p>}
        <fieldset className="automation-fieldset" disabled={!canChooseCreationGear}>
        <label>Main armor<select data-testid="automation-main-armor" value={card.mainArmorId ?? ""} onChange={(event) => commit({ mainArmorId: event.target.value || null, addonArmorIds: (card.addonArmorIds ?? []).slice(0, maxAddonPieces(event.target.value || null)) })}><option value="">Unarmored</option>{ARMOR.filter((entry) => entry.category === "Main Armor").map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.ac} · {entry.weightLb} lb</option>)}</select></label>
        <p className="automation-source">Add-ons: {(card.addonArmorIds ?? []).length}/{maxAddonPieces(card.mainArmorId)}</p>
        <div className="automation-checks">{ARMOR.filter((entry) => entry.category === "Add-on Armor").map((entry) => <label key={entry.id}><input type="checkbox" checked={(card.addonArmorIds ?? []).includes(entry.id)} onChange={() => commit({ addonArmorIds: (card.addonArmorIds ?? []).includes(entry.id) ? (card.addonArmorIds ?? []).filter((id) => id !== entry.id) : (card.addonArmorIds ?? []).length < maxAddonPieces(card.mainArmorId) ? [...(card.addonArmorIds ?? []), entry.id] : card.addonArmorIds })} />{entry.name} · {entry.ac}</label>)}</div>
        {(card.addonArmorIds ?? []).length > 0 && <div className="automation-checks automation-studs">{(card.addonArmorIds ?? []).map((id) => <label key={id}><input type="checkbox" checked={studdedAddonIdsOf(card).includes(id)} onChange={() => commit({ studdedAddonIds: studdedAddonIdsOf(card).includes(id) ? studdedAddonIdsOf(card).filter((entry) => entry !== id) : [...studdedAddonIdsOf(card), id] })} />Studs on {ARMOR_BY_ID[id]?.name}</label>)}</div>}
        <div className="automation-grid2">{EXTRA_SUBCATEGORIES.map((subcategory) => <label key={subcategory}>{subcategory}<select value={(card.extraArmorIds ?? []).find((id) => ARMOR_BY_ID[id]?.subcategory === subcategory) ?? ""} onChange={(event) => setExtra(subcategory, event.target.value)}><option value="">None</option>{ARMOR.filter((entry) => entry.category === "Extra" && entry.subcategory === subcategory && !entry.unique).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.weightLb} lb</option>)}</select></label>)}</div>
        </fieldset>
      </section>

      <section className="automation-section">
        <div className="automation-titleline"><h3>Equipment</h3><span className="automation-count">{result.fields.weight}</span></div>
        {!canChooseCreationGear && <p className="automation-warning">Creation is finished. Equipment changes now happen through the inventory, shop, trade, loot, or DM tools.</p>}
        <fieldset className="automation-fieldset" disabled={!canChooseCreationGear}>
        <div className="automation-add"><select aria-label="Equipment catalog" value={itemId} onChange={(event) => setItemId(event.target.value)}><option value="">Choose equipment…</option>{equipment.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.weightLb} lb</option>)}</select><button type="button" disabled={!itemId} onClick={() => { if (itemId) changeQty(itemId, 1); setItemId(""); }}>Add</button></div>
        <div className="automation-inventory">{(card.inventory ?? []).map((entry) => <div key={entry.itemId}><span>{ITEM_BY_ID[entry.itemId]?.name ?? entry.itemId}<small>{ITEM_BY_ID[entry.itemId]?.weightLb ?? 0} lb each</small></span><div><button type="button" aria-label={`Remove ${ITEM_BY_ID[entry.itemId]?.name ?? entry.itemId}`} onClick={() => changeQty(entry.itemId, -1)}>−</button><b>{entry.qty}</b><button type="button" aria-label={`Add ${ITEM_BY_ID[entry.itemId]?.name ?? entry.itemId}`} onClick={() => changeQty(entry.itemId, 1)}>+</button></div></div>)}</div>
        <p className="automation-source">Carrying: {result.fields.weightCondition}. Weight includes inventory, worn armor, and storage.</p>
        </fieldset>
      </section>

      <section className="automation-section automation-pending"><div className="automation-titleline"><h3>Still needs your decision</h3><span className={pending.length ? "automation-count pending" : "automation-count"}>{pending.length}</span></div>{pending.length ? pending.map((choice) => <div key={choice!.label}><b>{choice!.label}</b><span>{choice!.remaining} remaining</span><p>{choice!.reason}</p></div>) : <p>All currently supported decisions are complete.</p>}</section>

      <section className="automation-section"><h3>Why the sheet changed</h3><p className="automation-source">Automatically filled fields have a gold corner. Hover or focus one to see its rule source.</p><details><summary>Show calculated fields ({Object.keys(result.reasons).length})</summary><div className="automation-reasons">{Object.entries(result.reasons).map(([key, reason]) => <div key={key}><code>{key}</code><span>{reason}</span></div>)}</div></details>{(state.manualOverrides ?? []).length > 0 && <div className="automation-overrides"><h4>Kept as your own values</h4>{state.manualOverrides!.map((key) => <button type="button" key={key} onClick={() => restoreCalculated(key)}>Use calculated value for {key}</button>)}</div>}</section>
      {!state.setupComplete && card.classId && card.backgroundId && <button type="button" className="automation-finish" onClick={() => commit({ sheetAutomation: { ...state, setupComplete: true } })}>Finish character setup</button>}
    </aside>
  );
}
