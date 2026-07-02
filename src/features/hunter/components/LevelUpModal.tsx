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

/** Walks a hunter through every level gained since they last looked: the
 * features of each new level, plus the choices those levels grant (subclass at
 * 3+, feat/ASI, Epic Boon, Fighting Style) — applied to the card at the end. */
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
  // Choices accumulated across the walked levels.
  const [subclassId, setSubclassId] = useState<string | null>(card.subclassId ?? null);
  const [feats, setFeats] = useState<string[]>([]);
  const [asi, setAsi] = useState<Record<number, Partial<Record<AbilityKey, number>>>>({});

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

  function finish() {
    const abilities = { ...card.abilities };
    for (const alloc of Object.values(asi)) {
      for (const k of ABILITY_KEYS) {
        abilities[k] = Math.min(20, abilities[k] + (alloc[k] ?? 0));
      }
    }
    onPatch({
      abilities,
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

        {(grantsAsi || grantsBoon || grantsStyle) && (
          <FeatChoice
            key={lvl}
            kind={grantsBoon ? "boon" : grantsStyle ? "style" : "asi"}
            chosen={feats}
            asi={asi[lvl]}
            onAsi={(alloc) => setAsi((cur) => ({ ...cur, [lvl]: alloc }))}
            onFeat={(name) => setFeats((cur) => [...cur, name])}
            onUnfeat={(name) => setFeats((cur) => cur.filter((f) => f !== name))}
          />
        )}

        <div className="btn-row" style={{ marginTop: 14 }}>
          {idx > 0 && (
            <button className="btn btn-ghost" onClick={() => setIdx((i) => i - 1)}>Back</button>
          )}
          {idx < levels.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setIdx((i) => i + 1)}>Next level</button>
          ) : (
            <button className="btn btn-primary" onClick={finish}>Take up the hunt</button>
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

/** One level's feat-shaped choice: an ASI allocation (+2/+1+1 up to 2 points)
 * or a feat from the right category. */
function FeatChoice({
  kind,
  chosen,
  asi,
  onAsi,
  onFeat,
  onUnfeat,
}: {
  kind: "asi" | "boon" | "style";
  chosen: string[];
  asi: Partial<Record<AbilityKey, number>> | undefined;
  onAsi: (alloc: Partial<Record<AbilityKey, number>>) => void;
  onFeat: (name: string) => void;
  onUnfeat: (name: string) => void;
}) {
  const [tab, setTab] = useState<"asi" | "feat">(kind === "asi" ? "asi" : "feat");
  const pool = kind === "boon" ? EPIC_FEATS : kind === "style" ? STYLE_FEATS : GENERAL_FEATS;
  const label = kind === "boon" ? "Epic Boon" : kind === "style" ? "Fighting Style" : "Ability Score Improvement";
  const spent = ABILITY_KEYS.reduce((s, k) => s + (asi?.[k] ?? 0), 0);

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
              const v = asi?.[key] ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip selectable${v > 0 ? " selected" : ""}`}
                  onClick={() => {
                    const next = { ...asi };
                    if (v >= 2 || (v === 1 && spent >= 2)) next[key] = 0;
                    else if (spent < 2) next[key] = v + 1;
                    else next[key] = 0;
                    onAsi(next);
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
            const on = chosen.includes(f.name);
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
                onClick={() => (on ? onUnfeat(f.name) : onFeat(f.name))}
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
