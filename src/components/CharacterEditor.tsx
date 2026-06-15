import { useMemo, useState } from "react";
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
import { armorClass, maxHp } from "@/lib/character";
import { ABILITY_KEYS } from "@/lib/ability-keys";

interface Props {
  initial: HunterCard;
  saving: boolean;
  error: string | null;
  onSave: (card: HunterCard) => void;
  onCancel?: () => void;
}

// Split a final score into point-buy base (8–15) + background bonus (0–2).
function splitScore(final: number): { base: number; bonus: number } {
  const base = Math.min(POINT_BUY_MAX, Math.max(POINT_BUY_MIN, final));
  return { base, bonus: Math.max(0, Math.min(2, final - base)) };
}

export function CharacterEditor({ initial, saving, error, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [classId, setClassId] = useState(initial.classId);
  const [background, setBackground] = useState(initial.background);
  const [notes, setNotes] = useState(initial.notes);
  const [mainArmorId, setMainArmorId] = useState<string | null>(initial.mainArmorId);
  const [skills, setSkills] = useState<string[]>(initial.skillProficiencies);

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
  const hp = klass ? maxHp(klass, finalScores) : null;

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
    const next = getClass(id);
    if (next) {
      setSkills((cur) => cur.filter((s) => next.skillChoices.options.includes(s)));
    }
  }

  const nameOk = name.trim().length > 0;
  const classOk = !!classId;
  const skillsOk =
    !klass || skills.filter((s) => klass.skillChoices.options.includes(s)).length === klass.skillChoices.count;
  const canSave = nameOk && classOk && pointsLeft >= 0 && !saving;

  function handleSave() {
    if (!canSave) return;
    onSave({
      ...initial,
      name: name.trim(),
      classId,
      background: background.trim(),
      notes: notes.trim(),
      mainArmorId,
      skillProficiencies: skills,
      abilities: finalScores,
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Identity */}
      <div className="card">
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
        <div className="field" style={{ marginBottom: 0 }}>
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
      </div>

      {/* Class */}
      <div className="card">
        <p className="eyebrow">Step 1 · Class</p>
        <h3 style={{ marginBottom: 10 }}>Choose your hunter</h3>
        <div className="stack" style={{ gap: 8 }}>
          {CLASSES.map((c) => {
            const selected = c.id === classId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => chooseClass(c.id)}
                className="card card-hover"
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderColor: selected ? "var(--blood-bright)" : undefined,
                  background: selected ? "rgba(179,18,26,0.12)" : undefined,
                }}
              >
                <div className="row between">
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span className="faint" style={{ fontSize: "0.78rem" }}>
                    d{c.hitDie} · {c.primaryAbility}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: "0.88rem" }}>
                  {c.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ability scores */}
      <div className="card">
        <p className="eyebrow">Step 3 · Ability scores</p>
        <div className="row between" style={{ marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Point buy</h3>
          <span className={pointsLeft === 0 ? "gold" : "muted"}>
            {pointsLeft} / {POINT_BUY_BUDGET} points left
          </span>
        </div>
        <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
          Buy base scores 8–15 (27 pts). Then apply your background: +2 and +1, or
          three +1's {bonusValid ? "✓" : `(${bonusTotal}/3 used)`}.
        </p>

        <div className="stack" style={{ gap: 8 }}>
          {ABILITIES.map(({ key, name: aName, short }) => {
            const final = finalScores[key];
            return (
              <div
                key={key}
                className="row between"
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 96 }}>
                  <div style={{ fontWeight: 600 }}>{short}</div>
                  <div className="faint" style={{ fontSize: "0.72rem" }}>
                    {aName}
                  </div>
                </div>

                <Stepper
                  label="base"
                  value={base[key]}
                  min={POINT_BUY_MIN}
                  max={POINT_BUY_MAX}
                  onChange={(v) => setBaseScore(key, v)}
                />
                <Stepper
                  label="bg"
                  value={bonus[key]}
                  min={0}
                  max={2}
                  onChange={(v) => setBonusScore(key, v)}
                />

                <div style={{ textAlign: "right", minWidth: 58 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                    {final}
                  </div>
                  <div className="gold" style={{ fontSize: "0.8rem" }}>
                    {formatModifier(abilityModifier(final))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      {klass && (
        <div className="card">
          <p className="eyebrow">Step 2 · Skills</p>
          <h3 style={{ marginBottom: 6 }}>
            Choose {klass.skillChoices.count} proficiencies
          </h3>
          <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
            {skills.filter((s) => klass.skillChoices.options.includes(s)).length} /{" "}
            {klass.skillChoices.count} chosen
          </p>
          <div className="chip-row">
            {klass.skillChoices.options.map((skill) => {
              const selected = skills.includes(skill);
              const atLimit =
                !selected &&
                skills.filter((s) => klass.skillChoices.options.includes(s)).length >=
                  klass.skillChoices.count;
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
        </div>
      )}

      {/* Armor */}
      <div className="card">
        <p className="eyebrow">Step 4 · Armor</p>
        <h3 style={{ marginBottom: 8 }}>Main armor</h3>
        <div className="field" style={{ marginBottom: 8 }}>
          <select
            className="select"
            value={mainArmorId ?? ""}
            onChange={(e) => setMainArmorId(e.target.value || null)}
          >
            <option value="">Unarmored (AC 10 + Dex)</option>
            {MAIN_ARMOR.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.ac}
              </option>
            ))}
          </select>
        </div>
        <p className="faint" style={{ fontSize: "0.82rem", margin: 0 }}>
          {ac.category}: {ac.dexRule}
        </p>
      </div>

      {/* Derived preview */}
      {klass && (
        <div className="card">
          <p className="eyebrow">At a glance</p>
          <div className="derived-grid">
            <Derived label="Armor Class" value={ac.total} />
            <Derived label="Max HP" value={hp ?? "—"} />
            <Derived label="Speed" value={`${klass.speedFt}ft`} />
            <Derived label="Prof. Bonus" value="+2" />
          </div>
          <p className="faint center" style={{ fontSize: "0.78rem", marginTop: 10, marginBottom: 0 }}>
            Saving throws: {klass.savingThrows.map((k) => ABILITY_NAME[k]).join(" & ")}
          </p>
        </div>
      )}

      {/* Notes */}
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

      {error && <div className="banner banner-error">{error}</div>}
      {!skillsOk && classOk && (
        <div className="banner banner-warn">
          Pick exactly {klass?.skillChoices.count} skills to finish your build.
        </div>
      )}

      <div className="btn-row" style={{ position: "sticky", bottom: 0 }}>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          {saving ? "Saving…" : "Save hunter"}
        </button>
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
    <div style={{ textAlign: "center" }}>
      <div className="row" style={{ gap: 6, justifyContent: "center" }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: 32, padding: 6 }}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`decrease ${label}`}
        >
          −
        </button>
        <span style={{ minWidth: 18, fontFamily: "var(--font-display)" }}>{value}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: 32, padding: 6 }}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`increase ${label}`}
        >
          +
        </button>
      </div>
      <div className="faint" style={{ fontSize: "0.62rem", letterSpacing: "0.1em" }}>
        {label.toUpperCase()}
      </div>
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
