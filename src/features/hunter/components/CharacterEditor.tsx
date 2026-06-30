import { Fragment, useMemo, useState } from "react";
import type { AbilityKey, AbilityScores, HunterCard } from "@/types";
import { CLASSES, getClass } from "@/data/classes";
import { MAIN_ARMOR } from "@/data/armor";
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
import { armorClass, maxHp, maxSanity, proficiencyBonus } from "@/lib/character";
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

const STEP_TITLES = ["Class", "Details", "Abilities", "Skills", "Armor", "Review"];

// Split a final score into point-buy base (8–15) + background bonus (0–2).
function splitScore(final: number): { base: number; bonus: number } {
  const base = Math.min(POINT_BUY_MAX, Math.max(POINT_BUY_MIN, final));
  return { base, bonus: Math.max(0, Math.min(2, final - base)) };
}

export function CharacterEditor({ initial, saving, error, onSave, onCancel, onDelete, lockClass }: Props) {
  const [name, setName] = useState(initial.name);
  const [classId, setClassId] = useState(initial.classId);
  const [background, setBackground] = useState(initial.background);
  const [notes, setNotes] = useState(initial.notes);
  const [mainArmorId, setMainArmorId] = useState<string | null>(initial.mainArmorId);
  const [skills, setSkills] = useState<string[]>(initial.skillProficiencies);
  const [level, setLevel] = useState<number>(initial.level || 1);
  const [subclassId, setSubclassId] = useState<string | null>(initial.subclassId ?? null);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);

  const [base, setBase] = useState<Record<AbilityKey, number>>(() => {
    const out = {} as Record<AbilityKey, number>;
    for (const k of ABILITY_KEYS) out[k] = splitScore(initial.abilities[k]).base;
    return out;
  });
  const [bonus, setBonus] = useState<Record<AbilityKey, number>>(() => {
    const out = {} as Record<AbilityKey, number>;
    for (const k of ABILITY_KEYS) out[k] = splitScore(initial.abilities[k]).bonus;
    return out;
  });

  const klass = getClass(classId);

  const finalScores = useMemo<AbilityScores>(() => {
    const out = {} as AbilityScores;
    for (const k of ABILITY_KEYS) out[k] = base[k] + bonus[k];
    return out;
  }, [base, bonus]);

  const pointsSpent = useMemo(
    () => ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 0), 0),
    [base],
  );
  const pointsLeft = POINT_BUY_BUDGET - pointsSpent;
  const bonusTotal = ABILITY_KEYS.reduce((s, k) => s + bonus[k], 0);
  const bonusValid = bonusTotal === 3; // (2+1) or (1+1+1) both sum to 3

  const ac = armorClass(finalScores, mainArmorId);
  const hp = klass ? maxHp(klass, finalScores, level) : null;
  const sanMax = klass ? maxSanity(klass, finalScores, level) : null;
  const prof = proficiencyBonus(level);

  function setBaseScore(k: AbilityKey, next: number) {
    if (next < POINT_BUY_MIN || next > POINT_BUY_MAX) return;
    const projected = { ...base, [k]: next };
    const spent = ABILITY_KEYS.reduce((s, key) => s + (POINT_COST[projected[key]] ?? 0), 0);
    if (spent > POINT_BUY_BUDGET) return; // can't overspend
    setBase(projected);
  }

  function setBonusScore(k: AbilityKey, next: number) {
    if (next < 0 || next > 2) return;
    const projected = { ...bonus, [k]: next };
    if (projected[k] - bonus[k] > 0 && bonusTotal >= 3) return; // cap at 3 total
    setBonus(projected);
  }

  function toggleSkill(skill: string) {
    setSkills((cur) => {
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
    if (next) {
      setSkills((cur) => cur.filter((s) => next.skillChoices.options.includes(s)));
    }
  }

  const skillCount = klass ? skills.filter((s) => klass.skillChoices.options.includes(s)).length : 0;
  const skillsOk = !klass || skillCount === klass.skillChoices.count;

  // Everything that must be true before a hunter can be saved, each with a
  // message so a failed save can say exactly what's missing.
  const problems = useMemo(() => {
    const p: string[] = [];
    if (name.trim().length === 0) p.push("Give your hunter a name.");
    if (!classId) p.push("Choose a class.");
    if (pointsLeft > 0) p.push(`Spend all your ability points — ${pointsLeft} still left.`);
    if (bonusTotal !== 3) p.push(`Apply your background bonus (+2 and +1, or three +1s) — ${bonusTotal}/3 used.`);
    if (klass && !skillsOk) p.push(`Choose exactly ${klass.skillChoices.count} skill proficiencies.`);
    return p;
  }, [name, classId, pointsLeft, bonusTotal, klass, skillsOk]);

  // Per-step completion (drives the progress bar + Next gating).
  const stepValid = [
    !!classId,
    name.trim().length > 0,
    pointsLeft === 0 && bonusTotal === 3,
    !!klass && skillsOk,
    true,
    problems.length === 0,
  ];
  const last = STEP_TITLES.length - 1;

  const stepHint = (() => {
    if (step === 0) return "Choose a class to continue.";
    if (step === 1) return "Give your hunter a name.";
    if (step === 2)
      return pointsLeft > 0
        ? `Spend all your ability points — ${pointsLeft} still left.`
        : `Apply your background bonus (+2 and +1, or three +1s) — ${bonusTotal}/3 used.`;
    if (step === 3) return `Choose exactly ${klass?.skillChoices.count ?? 0} skill proficiencies.`;
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
      // jump to the first incomplete step so the fix is in view.
      const first = stepValid.findIndex((ok, i) => i < last && !ok);
      if (first >= 0) setStep(first);
      return;
    }
    onSave({
      ...initial,
      name: name.trim(),
      classId,
      subclassId,
      level,
      background: background.trim(),
      notes: notes.trim(),
      mainArmorId,
      skillProficiencies: skills,
      abilities: finalScores,
      sanity: initial.sanity ?? sanMax ?? 0,
      bloodTinge: initial.bloodTinge ?? false,
      preparedWhispers: initial.preparedWhispers ?? [],
      coins: initial.coins ?? 0,
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <WizardProgress step={step} valid={stepValid} onJump={jump} />

      {/* Step 1 · Class + subclass */}
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
                {klass.subclasses.map((s) => (
                  <SelectCard
                    key={s.id}
                    selected={s.id === subclassId}
                    onClick={() => setSubclassId(s.id)}
                    title={s.name}
                    sub={s.tagline}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2 · Details */}
      {step === 1 && (
        <div className="card">
          <p className="eyebrow">Step 2 · Details</p>
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
          <div className="field">
            <label htmlFor="bg">Background</label>
            <input
              id="bg"
              className="input"
              value={background}
              maxLength={60}
              placeholder="e.g. Plague Doctor, Deserter, Scholar…"
              onChange={(e) => setBackground(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Level</label>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: 40, padding: 6 }}
                disabled={level <= 1}
                onClick={() => setLevel((l) => Math.max(1, l - 1))}
                aria-label="decrease level"
              >
                −
              </button>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", minWidth: 28, textAlign: "center" }}>
                {level}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: 40, padding: 6 }}
                disabled={level >= 20}
                onClick={() => setLevel((l) => Math.min(20, l + 1))}
                aria-label="increase level"
              >
                +
              </button>
              <span className="faint" style={{ fontSize: "0.82rem" }}>Proficiency {formatModifier(prof)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 · Ability scores */}
      {step === 2 && (
        <div className="card">
          <p className="eyebrow">Step 3 · Ability scores</p>
          <div className="row between" style={{ marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>Point buy</h3>
            <span className={pointsLeft === 0 ? "gold" : "muted"}>
              {pointsLeft} / {POINT_BUY_BUDGET} points left
            </span>
          </div>
          <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
            Buy base scores 8–15 (27 pts). Then apply your background: +2 and +1, or three +1's{" "}
            {bonusValid ? "✓" : `(${bonusTotal}/3 used)`}.
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {ABILITIES.map(({ key, name: aName, short }) => {
              const final = finalScores[key];
              return (
                <div key={key} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{short}</div>
                    <div className="faint" style={{ fontSize: "0.72rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {aName}
                    </div>
                  </div>
                  <Stepper label="base" value={base[key]} min={POINT_BUY_MIN} max={POINT_BUY_MAX} onChange={(v) => setBaseScore(key, v)} />
                  <Stepper label="bg" value={bonus[key]} min={0} max={2} onChange={(v) => setBonusScore(key, v)} />
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

      {/* Step 4 · Skills */}
      {step === 3 && (
        <div className="card">
          <p className="eyebrow">Step 4 · Skills</p>
          {klass ? (
            <>
              <h3 style={{ marginBottom: 6 }}>Choose {klass.skillChoices.count} proficiencies</h3>
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                {skillCount} / {klass.skillChoices.count} chosen
              </p>
              <div className="chip-row">
                {klass.skillChoices.options.map((skill) => {
                  const selected = skills.includes(skill);
                  const atLimit = !selected && skillCount >= klass.skillChoices.count;
                  return (
                    <button
                      key={skill}
                      type="button"
                      className={`chip selectable${selected ? " selected" : ""}${atLimit ? " disabled" : ""}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>Choose a class first (Step 1) to see its skills.</p>
          )}
        </div>
      )}

      {/* Step 5 · Armor */}
      {step === 4 && (
        <div className="card">
          <p className="eyebrow">Step 5 · Armor</p>
          <h3 style={{ marginBottom: 8 }}>Main armor</h3>
          <div className="field" style={{ marginBottom: 8 }}>
            <select className="select" value={mainArmorId ?? ""} onChange={(e) => setMainArmorId(e.target.value || null)}>
              <option value="">Unarmored (AC 10 + Dex)</option>
              {MAIN_ARMOR.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.ac}</option>
              ))}
            </select>
          </div>
          <p className="faint" style={{ fontSize: "0.82rem", margin: 0 }}>{ac.category}: {ac.dexRule}</p>
        </div>
      )}

      {/* Step 6 · Review */}
      {step === 5 && (
        <>
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
                Saving throws: {klass.savingThrows.map((k) => ABILITY_NAME[k]).join(" & ")}
              </p>
            </div>
          )}

          <div className="card">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="textarea"
                value={notes}
                placeholder="Backstory, goals, quirks, anything you want at the table…"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

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

/** A selectable option card (class / subclass). */
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
