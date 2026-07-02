import { Fragment, useMemo, useState } from "react";
import type { AbilityKey, AbilityScores, Background, HunterCard } from "@/types";
import { CLASSES, getClass } from "@/data/classes";
import { MAIN_ARMOR, ADDON_ARMOR, EXTRA_ARMOR } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { ORIGIN_FEATS } from "@/data/feats";
import {
  ABILITIES,
  ABILITY_NAME,
  POINT_BUY_BUDGET,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
  POINT_COST,
  abilityModifier,
  formatModifier,
} from "@/data/abilities";
import {
  armorClass,
  maxAddonPieces,
  maxHp,
  maxSanity,
  proficiencyBonus,
  wornArmorWeight,
  DEEPCALLER_STAY_ID,
  ZEALOT_ID,
} from "@/lib/character";
import { startingKit, backgroundGold } from "@/lib/startingEquipment";
import { ABILITY_KEYS } from "@/lib/ability-keys";

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
  const [studded, setStudded] = useState<number>(initial.studdedAddons ?? 0);
  const [extraIds, setExtraIds] = useState<string[]>(initial.extraArmorIds ?? []);
  // Class-chosen skills only: strip the initial background's granted skills so
  // re-editing a saved hunter doesn't count background skills as class picks.
  const [classSkills, setClassSkills] = useState<string[]>(() => {
    const bgId = initialBackgroundId(initial);
    const granted = bgId ? BACKGROUNDS.find((b) => b.id === bgId)?.skills ?? [] : [];
    return initial.skillProficiencies.filter((s) => !granted.includes(s));
  });
  // Level is NOT player-editable: new hunters start at level 1; on an existing
  // hunter the DM's grants (insight / direct levels) own this number.
  const level = initial.level || 1;
  const [subclassId, setSubclassId] = useState<string | null>(initial.subclassId ?? null);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);

  // Point buy (default) or the table's "Maduhausu" rolled-stats method.
  const [mode, setMode] = useState<"pointbuy" | "maduhausu">(initial.abilityMode ?? "pointbuy");
  const [hasRolled, setHasRolled] = useState(initial.abilityMode === "maduhausu");
  // Ability scores are only re-validated (and re-saved) if the player actually
  // touches them — so editing armor on a leveled hunter never trips over the
  // creation-time point-buy rules or discards level-up ability increases.
  const creating = !initial.classId;
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
  const allSkills = useMemo(
    () => Array.from(new Set([...classSkills, ...bgSkills])),
    [classSkills, bgSkills],
  );

  const pointsSpent = useMemo(
    () => ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 0), 0),
    [base],
  );
  const pointsLeft = POINT_BUY_BUDGET - pointsSpent;
  const bonusTotal = ABILITY_KEYS.reduce((s, k) => s + bonus[k], 0);
  const bonusValid = bonusTotal === 3; // (2+1) or (1+1+1) both sum to 3
  // Untouched scores on an existing hunter are saved verbatim — no revalidation.
  const scoresOk =
    !abilitiesDirty || (mode === "maduhausu" ? hasRolled : pointsLeft === 0);
  const bonusOk = !abilitiesDirty || bonusTotal === 3;

  const maxAddons = maxAddonPieces(mainArmorId);
  const studdedMax = Math.min(5, addonIds.length);
  const ac = armorClass(finalScores, mainArmorId, addonIds, Math.min(studded, studdedMax));
  const hp = klass ? maxHp(klass, finalScores, level) : null;
  const sanMax = klass ? maxSanity(klass, finalScores, level) : null;
  const prof = proficiencyBonus(level);

  function setBaseScore(k: AbilityKey, next: number) {
    if (next < POINT_BUY_MIN || next > POINT_BUY_MAX) return;
    const projected = { ...base, [k]: next };
    const spent = ABILITY_KEYS.reduce((s, key) => s + (POINT_COST[projected[key]] ?? 0), 0);
    if (spent > POINT_BUY_BUDGET) return; // can't overspend
    setAbilitiesDirty(true);
    setBase(projected);
  }

  /** Maduhausu 🤡 — roll 4d6 drop lowest for each ability, assigned in order. */
  function rollMaduhausu() {
    const rollScore = () => {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => a - b);
      return dice[1] + dice[2] + dice[3];
    };
    const out = {} as Record<AbilityKey, number>;
    for (const k of ABILITY_KEYS) out[k] = rollScore();
    setAbilitiesDirty(true);
    setBase(out);
    setHasRolled(true);
  }

  function switchMode(next: "pointbuy" | "maduhausu") {
    if (next === mode) return;
    setAbilitiesDirty(true);
    setMode(next);
    if (next === "pointbuy") {
      // Rolled scores don't fit the 8–15 buy space — reset to a clean slate.
      const out = {} as Record<AbilityKey, number>;
      for (const k of ABILITY_KEYS) out[k] = 10;
      setBase(out);
    } else {
      setHasRolled(false);
    }
  }

  function toggleAddon(id: string) {
    setAddonIds((cur) => {
      if (cur.includes(id)) {
        const next = cur.filter((x) => x !== id);
        setStudded((s) => Math.min(s, Math.min(5, next.length)));
        return next;
      }
      if (cur.length >= maxAddons) return cur;
      return [...cur, id];
    });
  }

  function toggleExtra(id: string) {
    setExtraIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function setBonusScore(k: AbilityKey, next: number) {
    if (next < 0 || next > 2) return;
    if (!bonusAbilities.includes(k)) return; // background restricts which abilities benefit
    const projected = { ...bonus, [k]: next };
    if (projected[k] - bonus[k] > 0 && bonusTotal >= 3) return; // cap at 3 total
    setAbilitiesDirty(true);
    setBonus(projected);
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

  // Everything that must be true before a hunter can be saved.
  const problems = useMemo(() => {
    const p: string[] = [];
    if (name.trim().length === 0) p.push("Give your hunter a name.");
    if (!classId) p.push("Choose a class.");
    if (klass && !classSkillsOk) p.push(`Choose exactly ${klass.skillChoices.count} class skill proficiencies.`);
    if (!backgroundId) p.push("Choose a background.");
    if (bg?.feat && feat.trim().length === 0) p.push("Choose your Origin feat.");
    if (abilitiesDirty) {
      if (mode === "pointbuy" && pointsLeft > 0) p.push(`Spend all your ability points — ${pointsLeft} still left.`);
      if (mode === "maduhausu" && !hasRolled) p.push("Roll your Maduhausu scores.");
      if (bonusTotal !== 3) p.push(`Apply your background ability points (+2 and +1, or three +1s) — ${bonusTotal}/3 used.`);
    }
    return p;
  }, [name, classId, klass, classSkillsOk, backgroundId, bg, feat, abilitiesDirty, mode, hasRolled, pointsLeft, bonusTotal]);

  // Per-step completion (drives the progress bar + Next gating).
  const stepValid = [
    !!classId && classSkillsOk,
    !!backgroundId,
    scoresOk && bonusOk,
    true,
    problems.length === 0,
  ];
  const last = STEP_TITLES.length - 1;

  const stepHint = (() => {
    if (step === 0)
      return !classId ? "Choose a class to continue." : `Choose exactly ${klass?.skillChoices.count ?? 0} class skills.`;
    if (step === 1) return "Choose a background.";
    if (step === 2) {
      if (mode === "maduhausu" && !hasRolled) return "Roll your Maduhausu scores first.";
      return mode === "pointbuy" && pointsLeft > 0
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
    onSave({
      ...initial,
      name: name.trim(),
      classId,
      subclassId,
      level,
      lastSeenLevel: initial.lastSeenLevel ?? level,
      feats: initial.feats ?? [],
      background: bg?.name ?? initial.background.trim(),
      backgroundId: backgroundId ?? undefined,
      // null (not undefined) so switching to a no-feat background actually
      // CLEARS a previously stored feat under setDoc merge semantics.
      feat: bg?.feat ?? null,
      mainArmorId,
      addonArmorIds: addonIds.slice(0, maxAddons),
      studdedAddons: Math.min(studded, studdedMax),
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
              </>
            )}
          </div>

          {klass && klass.subclasses.length > 0 && (
            <div className="card">
              <p className="eyebrow">Subclass</p>
              <h3 style={{ marginBottom: 6 }}>{klass.name} path</h3>
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                {level >= 3 ? "Choose your specialization." : "Chosen at level 3 — you can pick now or later."}
              </p>
              <div className="stack" style={{ gap: 8 }}>
                <SelectCard selected={subclassId === null} onClick={() => setSubclassId(null)} title="Undecided" />
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
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                {classSkillCount} / {klass.skillChoices.count} chosen · your background grants two more.
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

      {/* Step 2 · Background */}
      {step === 1 && (
        <>
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
                />
              ))}
            </div>
          </div>

          {bg && (
            <div className="card">
              <p className="eyebrow">{bg.name}</p>
              <p className="muted" style={{ fontSize: "0.92rem", marginTop: 0 }}>{bg.text}</p>
              <div className="derived-grid">
                <Derived label="Skills" value={bg.skills.join(", ")} />
                <Derived label="Tool" value={bg.tool ?? "—"} />
                <Derived label="Boosts" value={bg.abilityScores.map((a) => ABILITY_NAME[a].slice(0, 3)).join(" · ")} />
              </div>
              {bg.equipment.length > 0 && (
                <p className="faint" style={{ fontSize: "0.82rem", marginTop: 8, marginBottom: 0 }}>
                  Equipment: {bg.equipment.join(", ")}
                </p>
              )}

              <hr className="divider" />
              <p className="eyebrow" style={{ marginBottom: 6 }}>Origin feat</p>
              {bg.feat ? (
                <p className="muted" style={{ fontSize: "0.92rem", marginTop: 0 }}>
                  <strong className="gold">{bg.feat}.</strong>{" "}
                  {ORIGIN_FEATS.find((f) => f.name === bg.feat)?.text ?? "Granted by this background."}
                </p>
              ) : (
                <p className="muted" style={{ fontSize: "0.92rem", marginTop: 0 }}>
                  <strong className="gold">None.</strong> This background grants no feat — its
                  edge is worldly: {backgroundPerks(bg)}.
                </p>
              )}

              {overlapSkills.length > 0 && (
                <div className="banner banner-warn" style={{ marginTop: 12 }}>
                  Your background already grants {overlapSkills.join(", ")}. Pick different class skills (Step 1) so a pick isn't wasted.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 3 · Ability scores */}
      {step === 2 && (
        <div className="card">
          <p className="eyebrow">Step 3 · Ability scores</p>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className={`chip selectable${mode === "pointbuy" ? " selected" : ""}`}
              onClick={() => switchMode("pointbuy")}
            >
              Point buy
            </button>
            <button
              type="button"
              className={`chip selectable${mode === "maduhausu" ? " selected" : ""}`}
              onClick={() => switchMode("maduhausu")}
            >
              Maduhausu 🤡
            </button>
          </div>

          {mode === "pointbuy" ? (
            <>
              <div className="row between" style={{ marginBottom: 4 }}>
                <h3 style={{ margin: 0 }}>Point buy</h3>
                <span className={pointsLeft === 0 ? "gold" : "muted"}>
                  {pointsLeft} / {POINT_BUY_BUDGET} points left
                </span>
              </div>
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                Buy base scores 8–15 (27 pts). Then apply your{" "}
                {bg ? `${bg.name} ` : ""}background bonus to{" "}
                {bonusAbilities.map((a) => ABILITY_NAME[a]).join(", ")}: +2 and +1, or three +1's{" "}
                {bonusValid ? "✓" : `(${bonusTotal}/3 used)`}.
              </p>
            </>
          ) : (
            <>
              <div className="row between" style={{ marginBottom: 4, gap: 8 }}>
                <h3 style={{ margin: 0 }}>Maduhausu 🤡</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ width: "auto", flex: "none" }}
                  onClick={rollMaduhausu}
                >
                  {hasRolled ? "Reroll the bones" : "Roll the bones"}
                </button>
              </div>
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                The madhouse method: 4d6 drop the lowest, six times, assigned in order —
                fate decides what you are. Then apply your background bonus to{" "}
                {bonusAbilities.map((a) => ABILITY_NAME[a]).join(", ")}: +2 and +1, or three +1's{" "}
                {bonusValid ? "✓" : `(${bonusTotal}/3 used)`}.
              </p>
            </>
          )}

          <div className="stack" style={{ gap: 8 }}>
            {ABILITIES.map(({ key, name: aName, short }) => {
              const final = finalScores[key];
              const canBonus = bonusAbilities.includes(key);
              return (
                <div key={key} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{short}</div>
                    <div className="faint" style={{ fontSize: "0.72rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {aName}
                    </div>
                  </div>
                  {mode === "pointbuy" ? (
                    <Stepper label="base" value={base[key]} min={POINT_BUY_MIN} max={POINT_BUY_MAX} onChange={(v) => setBaseScore(key, v)} />
                  ) : (
                    <div style={{ textAlign: "center", flex: "none", minWidth: 71 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
                        {hasRolled ? base[key] : "—"}
                      </div>
                      <div className="faint" style={{ fontSize: "0.62rem", letterSpacing: "0.1em" }}>ROLLED</div>
                    </div>
                  )}
                  {canBonus ? (
                    <Stepper label="bg" value={bonus[key]} min={0} max={2} onChange={(v) => setBonusScore(key, v)} />
                  ) : (
                    <div style={{ width: 71, flex: "none" }} aria-hidden />
                  )}
                  <div style={{ textAlign: "right", minWidth: 38, flex: "none" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1.1 }}>{final}</div>
                    <div className="gold" style={{ fontSize: "0.78rem" }}>{formatModifier(abilityModifier(final))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                  setStudded((s) => Math.min(s, Math.min(5, trimmed.length)));
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
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div className="row between" style={{ gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>Studs upgrade</span>
                    <div className="faint" style={{ fontSize: "0.74rem" }}>
                      +3 lb per studded piece · one +1 AC, five +2 AC · disadvantage on Stealth
                    </div>
                  </div>
                  <Stepper label="pieces" value={Math.min(studded, studdedMax)} min={0} max={studdedMax} onChange={setStudded} />
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <p className="eyebrow">Extras</p>
            <h3 style={{ marginBottom: 6 }}>Hats, scarves &amp; gloves</h3>
            <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
              No AC — but they hide what the blood is doing to you.
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {EXTRA_ARMOR.map((a) => (
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

          <div className="card">
            <p className="eyebrow">Armor Class</p>
            <div className="derived-grid">
              <Derived label="Base" value={ac.baseAc} />
              <Derived label="Add-ons" value={formatModifier(ac.addonBonus)} />
              <Derived label="Studs" value={formatModifier(ac.studBonus)} />
              <Derived label="Dex" value={formatModifier(ac.dexApplied)} />
              <Derived label="Total AC" value={ac.total} />
              <Derived label="Worn weight" value={`${wornArmorWeight({ mainArmorId, addonArmorIds: addonIds, studdedAddons: Math.min(studded, studdedMax), extraArmorIds: extraIds })} lb`} />
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
                  {level === 1
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
                  {subclassId ? ` (${klass.subclasses.find((s) => s.id === subclassId)?.name})` : ""} · Lvl {level}
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

/** A selectable option card (class / subclass / background). */
function SelectCard({
  selected,
  onClick,
  title,
  meta,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  meta?: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-hover"
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
