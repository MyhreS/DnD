import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { AbilityKey, AbilityScores, Background, HunterCard } from "@/types";
import { CLASSES, getClass } from "@/data/classes";
import { MAIN_ARMOR, ADDON_ARMOR, EXTRA_ARMOR, EXTRA_SUBCATEGORIES, ARMOR_BY_ID } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { ORIGIN_FEATS } from "@/data/feats";
import {
  ABILITY_NAME,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
  MADUHAUSU_MIN,
  MADUHAUSU_MAX,
  formatModifier,
} from "@/data/abilities";
import {
  armorClass,
  maxAddonPieces,
  maxHp,
  maxSanity,
  proficiencyBonus,
  studdedAddonIdsOf,
  subclassDisplayName,
  wornArmorWeight,
  DEEPCALLER_STAY_ID,
  INSIGHT_THRESHOLDS,
  ZEALOT_ID,
} from "@/lib/character";
import { startingKit, backgroundGold } from "@/lib/startingEquipment";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { baseSetBlock, bonusSetBlock, budgetFor, spentFor } from "../lib/abilityBuy";
import { AbilityScoresStep } from "./AbilityScoresStep";
import { ProgressionPreview } from "./ProgressionPreview";
import { StudsPanel } from "./StudsPanel";

interface Props {
  initial: HunterCard;
  saving: boolean;
  error: string | null;
  onSave: (card: HunterCard) => void;
  onCancel?: () => void;
  /** When provided (editing an existing card), shows the delete flow. */
  onDelete?: () => void | Promise<void>;
  /** Lock the class — editing an existing hunter can't change its type. */
  lockClass?: boolean;
}

// Steps mirror the handbook's Chapter 1: Class · Background · Ability Scores ·
// Armor · Details.
const STEP_TITLES = ["Class", "Background", "Abilities", "Armor", "Details"];

// Split a final score into point-buy base (8–15) + background bonus (0–2).
function splitScore(final: number): { base: number; bonus: number } {
  const base = Math.min(POINT_BUY_MAX, Math.max(POINT_BUY_MIN, final));
  return { base, bonus: Math.max(0, Math.min(2, final - base)) };
}

const ZERO_BONUS = (): Record<AbilityKey, number> => {
  const out = {} as Record<AbilityKey, number>;
  for (const k of ABILITY_KEYS) out[k] = 0;
  return out;
};

/** The no-feat trade-off, e.g. "30 GP · Poisoner's Kit proficiency". */
function backgroundPerks(b: Background): string {
  const gold = backgroundGold(b);
  const gear = b.equipment.filter((e) => !/^\d+\s*GP$/i.test(e.trim()));
  const parts = [
    gold > 0 ? `${gold} GP` : null,
    gear.length ? gear.join(", ") : null,
    b.tool ? `${b.tool} proficiency` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "extra standing in the world";
}

/** Pre-select a structured background from the card (by id, else by matching name). */
function initialBackgroundId(card: HunterCard): string | null {
  if (card.backgroundId && BACKGROUNDS.some((b) => b.id === card.backgroundId)) return card.backgroundId;
  const match = BACKGROUNDS.find((b) => b.name.toLowerCase() === card.background.trim().toLowerCase());
  return match?.id ?? null;
}

export function CharacterEditor({ initial, saving, error, onSave, onCancel, onDelete, lockClass }: Props) {
  const [name, setName] = useState(initial.name);
  const [classId, setClassId] = useState(initial.classId);
  const [backgroundId, setBackgroundId] = useState<string | null>(() => initialBackgroundId(initial));
  const [feat, setFeat] = useState<string>(initial.feat ?? "");
  const [mainArmorId, setMainArmorId] = useState<string | null>(initial.mainArmorId);
  const [addonIds, setAddonIds] = useState<string[]>(initial.addonArmorIds ?? []);
  // Per-piece Studs (studdedAddonIdsOf maps a legacy numeric count to ids).
  const [studdedIds, setStuddedIds] = useState<string[]>(() => studdedAddonIdsOf(initial));
  const [extraIds, setExtraIds] = useState<string[]>(initial.extraArmorIds ?? []);
  // Class-chosen skills only: strip the initial background's granted skills so
  // re-editing a saved hunter doesn't count background skills as class picks.
  const [classSkills, setClassSkills] = useState<string[]>(() => {
    const bgId = initialBackgroundId(initial);
    const granted = bgId ? BACKGROUNDS.find((b) => b.id === bgId)?.skills ?? [] : [];
    return initial.skillProficiencies.filter((s) => !granted.includes(s));
  });
  const creating = !initial.classId;
  // Level is pickable ONLY while creating (the tucked-away "Advanced" control
  // on Step 1, for joining mid-campaign at the DM's instruction). On an
  // existing hunter the DM's grants (insight / direct levels) own this number.
  const [level, setLevel] = useState(() => Math.max(1, Math.min(20, initial.level || 1)));
  const [subclassId, setSubclassId] = useState<string | null>(initial.subclassId ?? null);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);

  // Standard point buy (default) or the table's "Maduhausu" 57-point min-max buy.
  const [mode, setMode] = useState<"pointbuy" | "maduhausu">(initial.abilityMode ?? "pointbuy");
  // Ability scores are only re-validated (and re-saved) if the player actually
  // touches them — so editing armor on a leveled hunter never trips over the
  // creation-time point-buy rules or discards level-up ability increases.
  const [abilitiesDirty, setAbilitiesDirty] = useState(creating);

  const [base, setBase] = useState<Record<AbilityKey, number>>(() => {
    const out = {} as Record<AbilityKey, number>;
    // Attribute at most +2 per ability to the background bonus; everything
    // else (bought/rolled base + any level-up increases) counts as base, so
    // base + bonus always reproduces the saved final scores.
    for (const k of ABILITY_KEYS) {
      const b = initial.baseAbilities
        ? Math.max(0, Math.min(2, initial.abilities[k] - initial.baseAbilities[k]))
        : splitScore(initial.abilities[k]).bonus;
      out[k] = initial.abilities[k] - b;
      // Legacy Maduhausu cards were ROLLED (the old, wrong reading of the rule)
      // and can sit outside the buyable 3–16 space — clamp the editor state so
      // the steppers work. Untouched scores still save verbatim.
      if ((initial.abilityMode ?? "pointbuy") === "maduhausu") {
        out[k] = Math.max(MADUHAUSU_MIN, Math.min(MADUHAUSU_MAX, out[k]));
      }
    }
    return out;
  });
  const [bonus, setBonus] = useState<Record<AbilityKey, number>>(() => {
    const out = {} as Record<AbilityKey, number>;
    for (const k of ABILITY_KEYS) {
      out[k] = initial.baseAbilities
        ? Math.max(0, Math.min(2, initial.abilities[k] - initial.baseAbilities[k]))
        : splitScore(initial.abilities[k]).bonus;
    }
    return out;
  });

  const klass = getClass(classId);
  const bg = useMemo<Background | null>(
    () => (backgroundId ? BACKGROUNDS.find((b) => b.id === backgroundId) ?? null : null),
    [backgroundId],
  );
  // Which abilities the background bonus may be applied to (legacy cards: any).
  const bonusAbilities: readonly AbilityKey[] = bg ? bg.abilityScores : ABILITY_KEYS;
  const bgSkills = useMemo(() => bg?.skills ?? [], [bg]);

  const finalScores = useMemo<AbilityScores>(() => {
    const out = {} as AbilityScores;
    for (const k of ABILITY_KEYS) out[k] = base[k] + bonus[k];
    return out;
  }, [base, bonus]);

  // Class-chosen skills (validated against the class list) + background-granted.
  const classSkillCount = klass
    ? classSkills.filter((s) => klass.skillChoices.options.includes(s)).length
    : 0;
  const classSkillsOk = !klass || classSkillCount === klass.skillChoices.count;
  // >0 while picks remain; <0 only on legacy cards whose saved picks exceed the count.
  const skillsRemaining = klass ? klass.skillChoices.count - classSkillCount : 0;
  const allSkills = useMemo(
    () => Array.from(new Set([...classSkills, ...bgSkills])),
    [classSkills, bgSkills],
  );

  const budget = budgetFor(mode);
  const pointsSpent = useMemo(() => spentFor(mode, base) ?? 0, [base, mode]);
  const pointsLeft = budget - pointsSpent;
  const bonusTotal = ABILITY_KEYS.reduce((s, k) => s + bonus[k], 0);
  // Untouched scores on an existing hunter are saved verbatim — no revalidation.
  const scoresOk = !abilitiesDirty || pointsLeft === 0;
  const bonusOk = !abilitiesDirty || bonusTotal === 3;

  const maxAddons = maxAddonPieces(mainArmorId);
  const ac = armorClass(finalScores, mainArmorId, addonIds, studdedIds);
  const hp = klass ? maxHp(klass, finalScores, level) : null;
  const sanMax = klass ? maxSanity(klass, finalScores, level) : null;
  const prof = proficiencyBonus(level);

  function setBaseScore(k: AbilityKey, next: number) {
    // The guard is the SAME predicate the tiles use to explain a blocked +,
    // so the setter and the UI's reasons can never drift apart.
    if (baseSetBlock(mode, base, bonus, k, next) !== null) return;
    setAbilitiesDirty(true);
    setBase({ ...base, [k]: next });
  }

  function switchMode(next: "pointbuy" | "maduhausu") {
    if (next === mode) return;
    setAbilitiesDirty(true);
    setMode(next);
    if (next === "pointbuy") {
      // Maduhausu scores can sit outside the 8–15 buy space — reset to a clean slate.
      const out = {} as Record<AbilityKey, number>;
      for (const k of ABILITY_KEYS) out[k] = 10;
      setBase(out);
    }
    // → maduhausu keeps the current scores: 8–15 all fit the 3–16 buy space.
  }

  function toggleAddon(id: string) {
    setAddonIds((cur) => {
      if (cur.includes(id)) {
        // A removed piece can't stay studded.
        setStuddedIds((s) => s.filter((x) => x !== id));
        return cur.filter((x) => x !== id);
      }
      if (cur.length >= maxAddons) return cur;
      return [...cur, id];
    });
  }

  function toggleStudded(id: string) {
    setStuddedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  // Only ONE Extra per subcategory: picking a second hat SWAPS the first;
  // tapping the selected one deselects it.
  function toggleExtra(id: string) {
    setExtraIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      const sub = ARMOR_BY_ID[id]?.subcategory;
      const kept = sub ? cur.filter((x) => ARMOR_BY_ID[x]?.subcategory !== sub) : cur;
      return [...kept, id];
    });
  }

  function setBonusScore(k: AbilityKey, next: number) {
    // Same predicate as the tiles' gold-token blocked reasons — see above.
    if (bonusSetBlock(mode, base, bonus, bonusAbilities, k, next) !== null) return;
    setAbilitiesDirty(true);
    setBonus({ ...bonus, [k]: next });
  }

  function toggleClassSkill(skill: string) {
    setClassSkills((cur) => {
      if (cur.includes(skill)) return cur.filter((s) => s !== skill);
      if (!klass || cur.filter((s) => klass.skillChoices.options.includes(s)).length >= klass.skillChoices.count) {
        return cur; // at the limit
      }
      return [...cur, skill];
    });
  }

  // The creation-level picker (create-only). Dropping below 3 clears any chosen
  // subclass — a sub-3 hunter can't carry one out of the builder.
  function chooseCreationLevel(next: number) {
    const clamped = Math.max(1, Math.min(20, next));
    setLevel(clamped);
    if (clamped < 3) setSubclassId(null);
  }

  // When class changes, drop skills that aren't valid for the new class.
  function chooseClass(id: string) {
    setClassId(id);
    setSubclassId(null);
    const next = getClass(id);
    if (next) setClassSkills((cur) => cur.filter((s) => next.skillChoices.options.includes(s)));
  }

  // Choosing a background sets its granted feat (or none) and resets the
  // ability bonus, since the eligible abilities change.
  function chooseBackground(id: string) {
    if (id === backgroundId) return;
    setBackgroundId(id);
    const next = BACKGROUNDS.find((b) => b.id === id);
    setFeat(next?.feat ?? "");
    setAbilitiesDirty(true);
    setBonus(ZERO_BONUS());
  }

  // Class skills the player picked that the background also grants (redundant).
  const overlapSkills = classSkills.filter((s) => bgSkills.includes(s));

  // Docs-correct subclass rule: hidden below level 3; REQUIRED at 3+ (there is
  // no "Undecided" — same rule the LevelUpModal enforces at level 3).
  const subclassRequired = !!klass && klass.subclasses.length > 0 && level >= 3;
  const subclassOk = !subclassRequired || !!subclassId;

  // Everything that must be true before a hunter can be saved.
  const problems = useMemo(() => {
    const p: string[] = [];
    if (name.trim().length === 0) p.push("Give your hunter a name.");
    if (!classId) p.push("Choose a class.");
    if (klass && !classSkillsOk) p.push(`Choose exactly ${klass.skillChoices.count} class skill proficiencies.`);
    if (klass && subclassRequired && !subclassId) p.push(`Choose your ${klass.name} path.`);
    if (!backgroundId) p.push("Choose a background.");
    if (bg?.feat && feat.trim().length === 0) p.push("Choose your Origin feat.");
    if (abilitiesDirty) {
      if (pointsLeft !== 0) p.push(`Spend all your ability points — ${pointsLeft} still left.`);
      if (bonusTotal !== 3) p.push(`Apply your background ability points (+2 and +1, or three +1s) — ${bonusTotal}/3 used.`);
    }
    return p;
  }, [name, classId, klass, classSkillsOk, subclassRequired, subclassId, backgroundId, bg, feat, abilitiesDirty, pointsLeft, bonusTotal]);

  // Per-step completion (drives the progress bar + Next gating).
  const stepValid = [
    !!classId && classSkillsOk && subclassOk,
    !!backgroundId,
    scoresOk && bonusOk,
    true,
    problems.length === 0,
  ];
  const last = STEP_TITLES.length - 1;

  const stepHint = (() => {
    if (step === 0) {
      if (!classId) return "Choose a class to continue.";
      if (!subclassOk) return "Choose your path — a level 3+ hunter must have a subclass.";
      return `Choose exactly ${klass?.skillChoices.count ?? 0} class skills.`;
    }
    if (step === 1) return "Choose a background.";
    if (step === 2) {
      return pointsLeft !== 0
        ? `Spend all your ability points — ${pointsLeft} still left.`
        : `Apply your background ability points (+2 and +1, or three +1s) — ${bonusTotal}/3 used.`;
    }
    return "";
  })();

  function jump(i: number) {
    setStep(i);
    setAttempted(false);
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
    setAttempted(false);
  }
  function goNext() {
    if (step === last) {
      handleSave();
      return;
    }
    if (!stepValid[step]) {
      setAttempted(true);
      return;
    }
    setStep((s) => Math.min(last, s + 1));
    setAttempted(false);
  }

  function handleSave() {
    setAttempted(true);
    if (problems.length > 0 || saving) {
      const first = stepValid.findIndex((ok, i) => i < last && !ok);
      if (first >= 0) setStep(first);
      return;
    }
    // A brand-new hunter starts with the class + background starting kit
    // (real inventory items + starting gold). Edits keep what's carried.
    const kit = creating ? startingKit(klass, bg) : null;
    const savedAddons = addonIds.slice(0, maxAddons);
    const savedStuds = studdedIds.filter((id) => savedAddons.includes(id));
    onSave({
      ...initial,
      name: name.trim(),
      classId,
      subclassId,
      level,
      // Creating at level N starts "caught up" (lastSeenLevel = N) so the
      // level-up walkthrough doesn't immediately fire and walk levels 2..N.
      // That means ASI/feat picks for creation levels 4+ are NOT granted at
      // creation — an explicit follow-up, out of scope here (issue #126).
      lastSeenLevel: creating ? level : initial.lastSeenLevel ?? level,
      // Mid-campaign creation seeds Insight to the level's threshold, matching
      // the DM direct-grant semantics (DMCharacterEditor.setLevel) so the
      // "N to next level" math reads sensibly.
      insight: creating && level > 1 ? INSIGHT_THRESHOLDS[level - 1] : initial.insight ?? 0,
      feats: initial.feats ?? [],
      background: bg?.name ?? initial.background.trim(),
      backgroundId: backgroundId ?? undefined,
      // null (not undefined) so switching to a no-feat background actually
      // CLEARS a previously stored feat under setDoc merge semantics.
      feat: bg?.feat ?? null,
      mainArmorId,
      addonArmorIds: savedAddons,
      studdedAddonIds: savedStuds,
      // Legacy mirror (= the count) so stale cached PWA clients running the
      // old numeric math still compute the right AC and weight.
      studdedAddons: savedStuds.length,
      extraArmorIds: extraIds,
      skillProficiencies: allSkills,
      // Untouched ability scores round-trip verbatim — never re-derived, so
      // level-up increases survive unrelated edits (armor, name, whispers).
      abilities: abilitiesDirty ? finalScores : initial.abilities,
      baseAbilities: abilitiesDirty ? { ...base } : initial.baseAbilities ?? { ...base },
      abilityMode: abilitiesDirty ? mode : initial.abilityMode ?? mode,
      sanity: initial.sanity ?? sanMax ?? 0,
      bloodTinge: initial.bloodTinge ?? false,
      preparedWhispers: initial.preparedWhispers ?? [],
      coins: kit ? (initial.coins ?? 0) + kit.coins : initial.coins ?? 0,
      inventory: kit ? kit.inventory : initial.inventory,
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <WizardProgress step={step} valid={stepValid} onJump={jump} />

      {/* Step 1 · Class + subclass + class skills */}
      {step === 0 && (
        <>
          <div className="card">
            <p className="eyebrow">Step 1 · Class</p>
            {lockClass ? (
              <>
                <h3 style={{ marginBottom: 10 }}>Your class</h3>
                <div className="card" style={{ padding: 14 }}>
                  <div className="row between">
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{klass?.name ?? "—"}</span>
                    {klass && (
                      <span className="faint" style={{ fontSize: "0.78rem" }}>
                        d{klass.hitDie} · {klass.primaryAbility}
                      </span>
                    )}
                  </div>
                  {klass && <div className="muted" style={{ fontSize: "0.88rem" }}>{klass.tagline}</div>}
                </div>
                <p className="faint" style={{ fontSize: "0.8rem", marginTop: 10, marginBottom: 0 }}>
                  Your class is set. To play a different type of hunter, delete this one and create a new character.
                </p>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: 10 }}>Choose your hunter</h3>
                <div className="stack" style={{ gap: 8 }}>
                  {CLASSES.map((c) => (
                    <SelectCard
                      key={c.id}
                      selected={c.id === classId}
                      onClick={() => chooseClass(c.id)}
                      title={c.name}
                      meta={`d${c.hitDie} · ${c.primaryAbility}`}
                      sub={c.tagline}
                    />
                  ))}
                </div>
                {creating && (
                  <details style={{ marginTop: 12 }}>
                    <summary className="faint" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                      Advanced · starting level
                    </summary>
                    <div className="row between" style={{ marginTop: 10, gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>Starting level</span>
                        <div className="faint" style={{ fontSize: "0.74rem" }}>
                          Prof {formatModifier(proficiencyBonus(level))}
                          {level >= 3 ? " · subclass required" : ""}
                        </div>
                      </div>
                      <Stepper label="level" value={level} min={1} max={20} onChange={chooseCreationLevel} />
                    </div>
                    <p className="faint" style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
                      Nearly every hunter is forged at level 1 — the DM rewards Insight and
                      levels from play. Set a higher starting level only when joining
                      mid-campaign, at the DM's instruction.
                    </p>
                  </details>
                )}
              </>
            )}
          </div>

          {klass && klass.subclasses.length > 0 && level >= 3 && (
            <div className="card">
              <p className="eyebrow">Subclass</p>
              <h3 style={{ marginBottom: 6 }}>{klass.name} path</h3>
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                Your specialization — every level 3+ hunter has chosen a path.
              </p>
              <div className="stack" style={{ gap: 8 }}>
                {klass.id === "deepcaller" && (
                  <SelectCard
                    selected={subclassId === DEEPCALLER_STAY_ID}
                    onClick={() => setSubclassId(DEEPCALLER_STAY_ID)}
                    title="The Deepcaller Path"
                    sub="Stay the course — keep your Book, your Rites and every Deepcaller feature."
                  />
                )}
                {klass.subclasses.map((s) => (
                  <SelectCard
                    key={s.id}
                    selected={s.id === subclassId}
                    onClick={() => setSubclassId(s.id)}
                    title={s.name}
                    meta={s.id === ZEALOT_ID ? "Prestige class" : undefined}
                    sub={s.tagline}
                  />
                ))}
              </div>
              {subclassId === ZEALOT_ID && (
                <div className="banner banner-warn" style={{ marginTop: 10 }}>
                  <strong>Burn the Book.</strong> The Zealot is a prestige class: entering it
                  destroys your Book of the Deepcaller and REPLACES all Deepcaller features
                  gained so far with the Zealot's own. You keep your Whispers and your Rite
                  ability, and can no longer perform Rites of level 2+.
                </div>
              )}
            </div>
          )}

          {klass && (
            <div className="card">
              <p className="eyebrow">Class skills</p>
              <h3 style={{ marginBottom: 6 }}>Choose {klass.skillChoices.count} proficiencies</h3>
              <div
                className={`pick-counter${classSkillsOk ? " done" : ""}`}
                role="status"
                style={{ margin: "2px 0 10px" }}
              >
                {classSkillsOk ? "✓ " : ""}
                {classSkillCount} of {klass.skillChoices.count} chosen
                {skillsRemaining > 0
                  ? ` — pick ${skillsRemaining} more`
                  : skillsRemaining < 0
                    ? ` — remove ${-skillsRemaining}`
                    : ""}
              </div>
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                Your background grants two more skills in Step 2.
              </p>
              <div className="chip-row">
                {klass.skillChoices.options.map((skill) => {
                  const selected = classSkills.includes(skill);
                  const atLimit = !selected && classSkillCount >= klass.skillChoices.count;
                  return (
                    <button
                      key={skill}
                      type="button"
                      className={`chip selectable${selected ? " selected" : ""}${atLimit ? " disabled" : ""}`}
                      onClick={() => toggleClassSkill(skill)}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2 · Background — the tapped option expands in place (accordion) */}
      {step === 1 && (
        <div className="card">
          <p className="eyebrow">Step 2 · Background</p>
          <h3 style={{ marginBottom: 6 }}>Who were you before the hunt?</h3>
          <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
            Grants two skills, ability points and equipment — and either a Feat
            or richer worldly perks (gear, gold, proficiencies).
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {BACKGROUNDS.map((b) => (
              <SelectCard
                key={b.id}
                selected={b.id === backgroundId}
                onClick={() => chooseBackground(b.id)}
                title={b.name}
                meta={b.skills.join(" · ")}
                sub={b.feat ? `Feat: ${b.feat}` : `No feat — ${backgroundPerks(b)}`}
              >
                <div className="muted" style={{ fontSize: "0.9rem", marginBottom: 10 }}>{b.text}</div>
                <div className="derived-grid">
                  <Derived label="Skills" value={b.skills.join(", ")} />
                  <Derived label="Tool" value={b.tool ?? "—"} />
                  <Derived label="Boosts" value={b.abilityScores.map((a) => ABILITY_NAME[a].slice(0, 3)).join(" · ")} />
                </div>
                {b.equipment.length > 0 && (
                  <div className="faint" style={{ fontSize: "0.82rem", marginTop: 8 }}>
                    Equipment: {b.equipment.join(", ")}
                  </div>
                )}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>Origin feat</div>
                  {b.feat ? (
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      <strong className="gold">{b.feat}.</strong>{" "}
                      {ORIGIN_FEATS.find((f) => f.name === b.feat)?.text ?? "Granted by this background."}
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      <strong className="gold">None.</strong> This background grants no feat — its
                      edge is worldly: {backgroundPerks(b)}.
                    </div>
                  )}
                </div>
                {overlapSkills.length > 0 && (
                  <div className="banner banner-warn" style={{ marginTop: 10 }}>
                    Your background already grants {overlapSkills.join(", ")}. Pick different class skills (Step 1) so a pick isn't wasted.
                  </div>
                )}
              </SelectCard>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 · Ability scores */}
      {step === 2 && (
        <AbilityScoresStep
          mode={mode}
          base={base}
          bonus={bonus}
          finalScores={finalScores}
          bg={bg}
          bonusAbilities={bonusAbilities}
          pointsLeft={pointsLeft}
          bonusTotal={bonusTotal}
          leveledNote={!abilitiesDirty && level > 1}
          onSwitchMode={switchMode}
          onSetBase={setBaseScore}
          onSetBonus={setBonusScore}
        />
      )}

      {/* Step 4 · Armor — the full layered system: Main + Add-ons + Studs + Extras */}
      {step === 3 && (
        <>
          <div className="card">
            <p className="eyebrow">Step 4 · Armor</p>
            <h3 style={{ marginBottom: 8 }}>Main armor</h3>
            <div className="field" style={{ marginBottom: 8 }}>
              <select
                className="select"
                value={mainArmorId ?? ""}
                onChange={(e) => {
                  const nextMain = e.target.value || null;
                  // Losing Balanced Fit shrinks the add-on allowance — shed the
                  // overflow so an illegal 6-piece stack can't be kept or saved.
                  const trimmed = addonIds.slice(0, maxAddonPieces(nextMain));
                  setMainArmorId(nextMain);
                  setAddonIds(trimmed);
                  setStuddedIds((s) => s.filter((id) => trimmed.includes(id)));
                }}
              >
                <option value="">Unarmored (AC 10 + Dex)</option>
                {MAIN_ARMOR.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — {a.ac}</option>
                ))}
              </select>
            </div>
            {mainArmorId && (
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                {MAIN_ARMOR.find((a) => a.id === mainArmorId)?.special}
              </p>
            )}
          </div>

          <div className="card">
            <p className="eyebrow">Add-on armor</p>
            <h3 style={{ marginBottom: 6 }}>Layer up ({addonIds.length} / {maxAddons})</h3>
            <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
              Worn over your Main Armor — max five pieces{maxAddons === 6 ? " (+1 free from Balanced Fit)" : ""}.
              A pauldron and vambrace on the same arm form a Shield Arm: +2 AC for the pair.
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {ADDON_ARMOR.map((a) => {
                const selected = addonIds.includes(a.id);
                const atLimit = !selected && addonIds.length >= maxAddons;
                return (
                  <SelectCard
                    key={a.id}
                    selected={selected}
                    onClick={() => { if (!atLimit || selected) toggleAddon(a.id); }}
                    title={a.name}
                    meta={`${a.ac} · ${a.weightLb} lb`}
                    sub={a.special}
                  />
                );
              })}
            </div>

            {addonIds.length > 0 && (
              <StudsPanel addonIds={addonIds} studdedIds={studdedIds} onToggle={toggleStudded} />
            )}
          </div>

          <div className="card">
            <p className="eyebrow">Extras</p>
            <h3 style={{ marginBottom: 6 }}>Hats, scarves &amp; gloves</h3>
            <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
              No AC — but they hide what the blood is doing to you. One per
              subcategory: picking a second hat swaps the first.
            </p>
            <div className="stack" style={{ gap: 14 }}>
              {EXTRA_SUBCATEGORIES.map((sub) => (
                <div key={sub}>
                  <p className="eyebrow" style={{ marginBottom: 6 }}>{sub}</p>
                  <div className="stack" style={{ gap: 8 }}>
                    {EXTRA_ARMOR.filter((a) => a.subcategory === sub).map((a) => (
                      <SelectCard
                        key={a.id}
                        selected={extraIds.includes(a.id)}
                        onClick={() => toggleExtra(a.id)}
                        title={a.name}
                        meta={`${a.weightLb} lb`}
                        sub={a.special}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Armor Class</p>
            <div className="derived-grid">
              <Derived label="Base" value={ac.baseAc} />
              <Derived label="Add-ons" value={formatModifier(ac.addonBonus)} />
              <Derived label="Studs" value={formatModifier(ac.studBonus)} />
              <Derived label="Dex" value={formatModifier(ac.dexApplied)} />
              <Derived label="Total AC" value={ac.total} />
              <Derived label="Worn weight" value={`${wornArmorWeight({ mainArmorId, addonArmorIds: addonIds, studdedAddonIds: studdedIds, extraArmorIds: extraIds })} lb`} />
            </div>
            <p className="faint" style={{ fontSize: "0.82rem", margin: "8px 0 0" }}>{ac.category}: {ac.dexRule}</p>
          </div>
        </>
      )}

      {/* Step 5 · Details (name, level, review, notes) */}
      {step === 4 && (
        <>
          <div className="card">
            <p className="eyebrow">Step 5 · Details</p>
            <div className="field">
              <label htmlFor="hunter-name">Hunter name</label>
              <input
                id="hunter-name"
                className="input"
                value={name}
                maxLength={40}
                placeholder="What do they call you?"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="row between" style={{ marginBottom: 0, gap: 8 }}>
              <div>
                <span className="eyebrow" style={{ margin: 0 }}>Level</span>
                <div className="faint" style={{ fontSize: "0.78rem" }}>
                  {creating && level > 1
                    ? `Starting at level ${level} — set at the DM's instruction. From here, Insight and levels come from play.`
                    : level === 1
                      ? "Every hunter starts at level 1 — the DM rewards Insight and levels."
                      : "Set by the DM's rewards — Insight and levels come from play."}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", flex: "none" }}>
                {level}
                <span className="faint" style={{ fontSize: "0.82rem" }}> · Prof {formatModifier(prof)}</span>
              </span>
            </div>
          </div>

          {klass && (
            <div className="card">
              <p className="eyebrow">At a glance</p>
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>
                {name.trim() || "Unnamed Hunter"}
                <span className="faint" style={{ fontSize: "0.82rem", fontWeight: 400 }}>
                  {" "}· {klass.name}
                  {subclassId
                    ? ` (${subclassDisplayName(klass.subclasses.find((s) => s.id === subclassId)?.name, subclassId)})`
                    : ""} · Lvl {level}
                </span>
              </h3>
              <div className="derived-grid">
                <Derived label="Armor Class" value={ac.total} />
                <Derived label="Max HP" value={hp ?? "—"} />
                <Derived label="Sanity" value={sanMax ?? "—"} />
                <Derived label="Speed" value={`${klass.speedFt}ft`} />
                <Derived label="Prof. Bonus" value={formatModifier(prof)} />
                <Derived label="Sanity Die" value={klass.sanityDie} />
              </div>
              <p className="faint center" style={{ fontSize: "0.78rem", marginTop: 10, marginBottom: 0 }}>
                {bg ? `${bg.name} · ` : ""}{feat ? `${feat} · ` : ""}
                {allSkills.length > 0 ? `Skills: ${allSkills.join(", ")}` : ""}
              </p>
            </div>
          )}

          {klass && (
            <ProgressionPreview
              klass={klass}
              subclassId={subclassId}
              abilities={finalScores}
              startLevel={level}
            />
          )}

          {onDelete && <DeleteCharacter saving={saving} onDelete={onDelete} />}

          {attempted && problems.length > 0 && (
            <div className="banner banner-error">
              <strong>Not saved — finish these first:</strong>
              <ul className="list-reset" style={{ display: "grid", gap: 3, marginTop: 6 }}>
                {problems.map((p) => (<li key={p}>• {p}</li>))}
              </ul>
            </div>
          )}
        </>
      )}

      {error && <div className="banner banner-error">{error}</div>}
      {attempted && step !== last && !stepValid[step] && (
        <div className="banner banner-error">{stepHint}</div>
      )}

      {/* Wizard navigation */}
      <div className="btn-row" style={{ marginTop: 4 }}>
        {step === 0 ? (
          onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          )
        ) : (
          <button type="button" className="btn btn-ghost" onClick={goBack} disabled={saving}>Back</button>
        )}
        <button type="button" className="btn btn-primary" onClick={goNext} disabled={saving}>
          {step === last
            ? saving
              ? (<><span className="btn-spinner" aria-hidden /> Saving…</>)
              : "Save hunter"
            : "Next"}
        </button>
      </div>
    </div>
  );
}

/** The numbered step rail across the top — tap a step to jump to it. */
function WizardProgress({
  step,
  valid,
  onJump,
}: {
  step: number;
  valid: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <div>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 0 }}>
        {STEP_TITLES.map((title, i) => {
          const current = i === step;
          const done = valid[i] && !current;
          return (
            <Fragment key={title}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: "var(--border)", margin: "0 2px" }} />}
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Step ${i + 1}: ${title}`}
                aria-current={current ? "step" : undefined}
                style={{
                  width: 30,
                  height: 30,
                  flex: "none",
                  borderRadius: "50%",
                  border: `1.5px solid ${current ? "var(--blood-bright)" : done ? "var(--gold-dim)" : "var(--border-strong)"}`,
                  background: current ? "var(--blood)" : "transparent",
                  color: current ? "#fff" : done ? "var(--gold)" : "var(--ink-dim)",
                  fontFamily: "var(--font-display)",
                  fontSize: "0.85rem",
                  lineHeight: 1,
                }}
              >
                {done ? "✓" : i + 1}
              </button>
            </Fragment>
          );
        })}
      </div>
      <p className="eyebrow center" style={{ marginTop: 8, marginBottom: 0 }}>
        Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}
      </p>
    </div>
  );
}

/** A selectable option card (class / subclass / background). Optional children
 *  render as an accordion detail INSIDE the card while it is selected. */
function SelectCard({
  selected,
  onClick,
  title,
  meta,
  sub,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  meta?: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-hover"
      aria-expanded={children !== undefined ? selected : undefined}
      style={{
        textAlign: "left",
        padding: 14,
        borderColor: selected ? "var(--blood-bright)" : undefined,
        background: selected ? "rgba(179,18,26,0.12)" : undefined,
      }}
    >
      <div className="row between">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</span>
        {meta && <span className="faint" style={{ fontSize: "0.78rem" }}>{meta}</span>}
      </div>
      {sub && <div className="muted" style={{ fontSize: "0.88rem" }}>{sub}</div>}
      {children !== undefined && selected && <div className="select-card-detail">{children}</div>}
    </button>
  );
}

/** Delete a character behind TWO explicit confirmations. */
function DeleteCharacter({
  saving,
  onDelete,
}: {
  saving: boolean;
  onDelete: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  if (step === 0) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 4, color: "var(--blood-bright)" }}
        onClick={() => setStep(1)}
        disabled={saving}
      >
        Delete character
      </button>
    );
  }

  return (
    <div className="card" style={{ borderColor: "var(--blood-bright)" }}>
      <p style={{ marginBottom: 10 }}>
        {step === 1
          ? "Delete this character? Your DM can still recover it until the session ends."
          : "Are you absolutely sure? Your hunter is removed from play (the DM can recover it this session)."}
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => setStep(0)} disabled={saving}>Keep</button>
        {step === 1 ? (
          <button type="button" className="btn btn-ghost" style={{ color: "var(--blood-bright)" }} onClick={() => setStep(2)} disabled={saving}>
            Yes, delete
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void onDelete()} disabled={saving}>
            {saving ? (<><span className="btn-spinner" aria-hidden /> Deleting…</>) : "Delete forever"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ textAlign: "center", flex: "none" }}>
      <div className="row" style={{ gap: 3, justifyContent: "center" }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: 26, padding: 4 }}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`decrease ${label}`}
        >
          −
        </button>
        <span style={{ minWidth: 16, fontFamily: "var(--font-display)" }}>{value}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: 26, padding: 4 }}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`increase ${label}`}
        >
          +
        </button>
      </div>
      <div className="faint" style={{ fontSize: "0.62rem", letterSpacing: "0.1em" }}>{label.toUpperCase()}</div>
    </div>
  );
}

function Derived({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
