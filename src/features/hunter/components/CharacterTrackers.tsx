import { getClass } from "@/data/classes";
import { maxHp, maxSanity } from "@/lib/character";
import { TransformationStatus, TransformationEditor } from "./TransformationPanel";
import { usePlayerStore } from "../store/playerStore";
import type { HunterCard } from "@/types";

/** Live, editable play trackers: HP, Sanity (with derived Madness + the Insane
 * state), Transformation (read-only for players — rolled physically at the
 * table and recorded by the DM; dmMode gets the editor), and Blood Tinge
 * (spend-only for players — the DM grants it). Saved on change. */
export function CharacterTrackers({
  card,
  onPatch,
  dmMode = false,
}: {
  card: HunterCard;
  /** When provided (e.g. the DM playing as this hunter), edits route here
   * instead of the owner's playerStore — so the owner's own selection isn't
   * clobbered. */
  onPatch?: (p: Partial<HunterCard>) => void;
  /** DM controls: may grant Blood Tinge and edit Transformation (players can
   * only spend / view). */
  dmMode?: boolean;
}) {
  const save = usePlayerStore((s) => s.save);
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  // Clamp the displayed value: a saved HP/Sanity can exceed a max that later
  // dropped (e.g. a CON/WIS change), which would render an over-100% bar.
  const hp = Math.min(hpMax, card.currentHp ?? hpMax);
  const sanMax = klass ? maxSanity(klass, card.abilities, card.level) : 0;
  const san = Math.min(sanMax, card.sanity ?? sanMax);
  const madness = Math.max(0, sanMax - san);
  // Madness has reached Max Sanity — the hunter is Insane. What that MEANS
  // stays at the table: the app only ever shows the state itself.
  const insane = sanMax > 0 && madness >= sanMax;

  function patch(p: Partial<HunterCard>) {
    if (onPatch) onPatch(p);
    else void save({ ...card, ...p });
  }

  return (
    <div className="card">
      <p className="eyebrow" style={{ margin: "0 0 10px" }}>Vitals · tracked in play</p>

      <Tracker
        label="Hit Points"
        value={hp}
        max={hpMax}
        color="var(--blood-bright)"
        onChange={(v) => patch({ currentHp: Math.max(0, Math.min(hpMax, v)) })}
      />
      <Tracker
        label="Sanity"
        badge={insane ? "INSANE" : undefined}
        sub={`Madness ${madness}${insane ? " — the DM knows what this means" : ""}`}
        value={san}
        max={sanMax}
        color="#7c5cff"
        onChange={(v) => patch({ sanity: Math.max(0, Math.min(sanMax, v)) })}
      />
      {dmMode ? (
        <TransformationEditor card={card} onPatch={patch} />
      ) : (
        <TransformationStatus card={card} />
      )}

      <div className="row between" style={{ padding: "10px 0 2px" }}>
        <div>
          <span style={{ fontWeight: 600 }}>Blood Tinge</span>
          <div className="faint" style={{ fontSize: "0.74rem" }}>
            {card.bloodTinge ? "Held — spend it to reroll a d20" : "Granted by the DM"}
          </div>
        </div>
        {card.bloodTinge ? (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ width: "auto", minWidth: 84 }}
            onClick={() => patch({ bloodTinge: false })}
          >
            ● Spend
          </button>
        ) : dmMode ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ width: "auto", minWidth: 84 }}
            onClick={() => patch({ bloodTinge: true })}
          >
            ○ Grant
          </button>
        ) : (
          <span className="faint" style={{ fontSize: "0.9rem" }}>○ None</span>
        )}
      </div>

      {hp <= 0 && (
        <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {card.deathPending ? (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              <strong className="blood">Fallen.</strong> Awaiting the DM to confirm your hunter's death.
            </p>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: "0.9rem" }}>
                <strong className="blood">0 Hit Points.</strong> If your hunter has truly fallen, confirm
                their death — the DM still has to verify it.
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--blood-bright)", width: "auto" }}
                onClick={() => patch({ deathPending: true })}
              >
                Confirm my hunter's death
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Tracker({
  label,
  badge,
  sub,
  value,
  max,
  color,
  onChange,
}: {
  label: string;
  badge?: string;
  sub?: string;
  value: number;
  max?: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const pct = max && max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="row between" style={{ marginBottom: max ? 6 : 0 }}>
        <div>
          <span style={{ fontWeight: 600 }}>{label}</span>
          {badge && (
            <span
              className="chip"
              style={{
                marginLeft: 8,
                fontSize: "0.66rem",
                color: "var(--blood-bright)",
                borderColor: "var(--blood-bright)",
              }}
            >
              {badge}
            </span>
          )}
          {sub && <div className="faint" style={{ fontSize: "0.72rem" }}>{sub}</div>}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 38, padding: 6 }} onClick={() => onChange(value - 1)} aria-label={`decrease ${label}`}>−</button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", minWidth: 56, textAlign: "center" }}>
            {value}{max ? <span className="faint" style={{ fontSize: "0.9rem" }}> / {max}</span> : null}
          </span>
          <button className="btn btn-ghost btn-sm" style={{ width: 38, padding: 6 }} onClick={() => onChange(value + 1)} aria-label={`increase ${label}`}>+</button>
        </div>
      </div>
      {max ? (
        <div style={{ height: 6, borderRadius: 6, background: "var(--bg)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.2s ease" }} />
        </div>
      ) : null}
    </div>
  );
}
