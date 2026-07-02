import { useState } from "react";
import type { AbilityKey, HunterCard } from "@/types";
import { getClass, getSubclass } from "@/data/classes";
import { FEATS } from "@/data/feats";
import { ABILITIES, formatModifier } from "@/data/abilities";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { DEEPCALLER_STAY_ID, ZEALOT_ID, isZealot } from "@/lib/character";

const GENERAL_FEATS = FEATS.filter((f) => f.category === "General");
const EPIC_FEATS = FEATS.filter((f) => f.category === "Epic Boon");
const STYLE_FEATS = FEATS.filter((f) => f.category === "Fighting Style");

/** One level's choice: EITHER an ASI allocation (2 points) OR one feat. */
interface LevelChoice {
  asi?: Partial<Record<AbilityKey, number>>;
  feat?: string;
}

const asiSpent = (asi: LevelChoice["asi"]) =>
  ABILITY_KEYS.reduce((s, k) => s + (asi?.[k] ?? 0), 0);

/** Walks a hunter through every level gained since they last looked: the
 * features of each new level, plus the choices those levels grant (subclass at
 * 3+, feat OR ASI, Epic Boon, Fighting Style) — one choice per level, required
 * before moving on, all applied to the card at the end. */
export function LevelUpModal({
  card,
  onPatch,
}: {
  card: HunterCard;
  onPatch: (p: Partial<HunterCard>) => void;
}) {
  const from = card.lastSeenLevel ?? card.level;
  const levels = Array.from({ length: card.level - from }, (_, i) => from + 1 + i);
  const [idx, setIdx] = useState(0);
  // Choices accumulated across the walked levels (one per level).
  const [subclassId, setSubclassId] = useState<string | null>(card.subclassId ?? null);
  const [choices, setChoices] = useState<Record<number, LevelChoice>>({});

  const klass = getClass(card.classId);
  if (!klass || levels.length === 0) return null;
  const lvl = levels[idx];
  const zealot = subclassId === ZEALOT_ID || isZealot(card);

  const row = klass.progression.find((r) => r.level === lvl);
  const sub = getSubclass(card.classId, subclassId);
  const gained = [
    ...(zealot ? [] : (klass.features ?? []).filter((f) => f.level === lvl)),
    ...(sub?.features ?? []).filter((f) => f.level === lvl),
  ];

  const needsSubclass = lvl >= 3 && !subclassId && klass.subclasses.length > 0;
  const rowFeatures = row?.features ?? "";
  const grantsAsi = /Ability Score Improvement/i.test(rowFeatures);
  const grantsBoon = /Epic Boon/i.test(rowFeatures);
  const grantsStyle = /Fighting Style/i.test(rowFeatures) && lvl > 1;
  const grantsChoice = grantsAsi || grantsBoon || grantsStyle;

  const choice = choices[lvl] ?? {};
  const choiceDone =
    !grantsChoice || !!choice.feat || (grantsAsi && asiSpent(choice.asi) === 2);
  const levelDone = !needsSubclass && choiceDone;

  function setChoice(next: LevelChoice) {
    setChoices((cur) => ({ ...cur, [lvl]: next }));
  }

  function finish() {
    const abilities = { ...card.abilities };
    // ASI raises the BASE scores — keep baseAbilities in step so re-editing
    // the hunter doesn't misread the increase as background bonus points.
    const baseAbilities = { ...(card.baseAbilities ?? card.abilities) };
    for (const c of Object.values(choices)) {
      if (!c.asi) continue;
      for (const k of ABILITY_KEYS) {
        const inc = c.asi[k] ?? 0;
        if (!inc) continue;
        const applied = Math.min(20, abilities[k] + inc) - abilities[k];
        abilities[k] += applied;
        baseAbilities[k] += applied;
      }
    }
    const feats = Object.values(choices)
      .map((c) => c.feat)
      .filter((f): f is string => !!f);
    onPatch({
      abilities,
      baseAbilities,
      feats: [...(card.feats ?? []), ...feats],
      subclassId,
      lastSeenLevel: card.level,
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Level up">
      <div className="modal">
        <p className="eyebrow" style={{ marginTop: 0 }}>
          Level up · {idx + 1} of {levels.length}
        </p>
        <h2 style={{ margin: "0 0 4px" }}>Level {lvl}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
          {klass.title}{rowFeatures && rowFeatures !== "—" ? ` — ${rowFeatures}` : ""}
        </p>

        {gained.length > 0 && (
          <div className="stack" style={{ gap: 4, marginBottom: 12 }}>
            {gained.map((f) => (
              <details key={f.name}>
                <summary style={{ cursor: "pointer", fontSize: "0.92rem" }}>
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                </summary>
                <p className="muted" style={{ fontSize: "0.86rem", margin: "6px 0 4px", whiteSpace: "pre-wrap" }}>{f.text}</p>
              </details>
            ))}
          </div>
        )}

        {needsSubclass && (
          <div style={{ marginBottom: 12 }}>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Choose your path</p>
            <div className="stack" style={{ gap: 6 }}>
              {klass.id === "deepcaller" && (
                <PathButton
                  title="The Deepcaller Path"
                  sub="Stay the course — keep your Book and every Deepcaller feature."
                  onClick={() => setSubclassId(DEEPCALLER_STAY_ID)}
                />
              )}
              {klass.subclasses.map((s) => (
                <PathButton
                  key={s.id}
                  title={s.name}
                  sub={s.id === ZEALOT_ID ? "Prestige class — replaces ALL your Deepcaller features." : s.tagline}
                  onClick={() => setSubclassId(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {grantsChoice && (
          <FeatChoice
            key={lvl}
            kind={grantsBoon ? "boon" : grantsStyle ? "style" : "asi"}
            choice={choice}
            onChange={setChoice}
          />
        )}

        {!levelDone && (
          <p className="faint" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>
            {needsSubclass
              ? "Choose a path to continue."
              : "Make your pick to continue — +2 in ability points, or one feat."}
          </p>
        )}

        <div className="btn-row" style={{ marginTop: 14 }}>
          {idx > 0 && (
            <button className="btn btn-ghost" onClick={() => setIdx((i) => i - 1)}>Back</button>
          )}
          {idx < levels.length - 1 ? (
            <button className="btn btn-primary" disabled={!levelDone} onClick={() => setIdx((i) => i + 1)}>
              Next level
            </button>
          ) : (
            <button className="btn btn-primary" disabled={!levelDone} onClick={finish}>
              Take up the hunt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PathButton({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="card card-hover"
      style={{ textAlign: "left", padding: 12 }}
      onClick={onClick}
    >
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</span>
      {sub && <div className="muted" style={{ fontSize: "0.84rem" }}>{sub}</div>}
    </button>
  );
}

/** One level's feat-shaped choice: an ASI allocation (+2 / +1+1) OR exactly one
 * feat from the right category — picking one side clears the other. */
function FeatChoice({
  kind,
  choice,
  onChange,
}: {
  kind: "asi" | "boon" | "style";
  choice: LevelChoice;
  onChange: (c: LevelChoice) => void;
}) {
  const [tab, setTab] = useState<"asi" | "feat">(kind === "asi" ? "asi" : "feat");
  const pool = kind === "boon" ? EPIC_FEATS : kind === "style" ? STYLE_FEATS : GENERAL_FEATS;
  const label = kind === "boon" ? "Epic Boon" : kind === "style" ? "Fighting Style" : "Ability Score Improvement";
  const spent = asiSpent(choice.asi);

  return (
    <div style={{ marginBottom: 4 }}>
      <p className="eyebrow" style={{ marginBottom: 6 }}>{label}</p>
      {kind === "asi" && (
        <div className="chip-row" style={{ marginBottom: 8 }}>
          <button type="button" className={`chip selectable${tab === "asi" ? " selected" : ""}`} onClick={() => setTab("asi")}>
            Ability scores
          </button>
          <button type="button" className={`chip selectable${tab === "feat" ? " selected" : ""}`} onClick={() => setTab("feat")}>
            A feat instead
          </button>
        </div>
      )}
      {tab === "asi" && kind === "asi" ? (
        <>
          <p className="faint" style={{ fontSize: "0.8rem", marginTop: 0 }}>
            Spend 2 points: +2 to one ability, or +1 to two. ({spent}/2 spent)
          </p>
          <div className="chip-row">
            {ABILITIES.map(({ key, short }) => {
              const v = choice.asi?.[key] ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip selectable${v > 0 ? " selected" : ""}`}
                  onClick={() => {
                    // Cycle 0 → 1 → 2 → 0 within the 2-point budget; any ASI
                    // edit drops a previously chosen feat (one choice per level).
                    const asi = { ...choice.asi };
                    const atBudget = spent >= 2;
                    asi[key] = v >= 2 || (v > 0 && atBudget) ? 0 : atBudget ? v : v + 1;
                    onChange({ asi });
                  }}
                >
                  {short}{v > 0 ? ` ${formatModifier(v)}` : ""}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="stack" style={{ gap: 4, maxHeight: 240, overflowY: "auto" }}>
          {pool.map((f) => {
            const on = choice.feat === f.name;
            return (
              <button
                key={f.id}
                type="button"
                className="row between card-hover"
                style={{
                  background: on ? "rgba(179,18,26,0.12)" : "var(--bg-elev-2)",
                  border: `1px solid ${on ? "var(--blood-bright)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  gap: 8,
                  textAlign: "left",
                }}
                onClick={() => onChange(on ? {} : { feat: f.name })}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.name}</span>
                  {f.prerequisite && (
                    <span className="faint" style={{ fontSize: "0.72rem" }}> · {f.prerequisite}</span>
                  )}
                </span>
                <span className="gold" style={{ flex: "none", fontSize: "0.82rem" }}>{on ? "Chosen ✓" : "Choose"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
