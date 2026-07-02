import { useState } from "react";
import { CONDITIONS, CONDITION_NAME } from "@/data/conditions";
import type { Combatant } from "@/types";

/** "Poisoned · 3r" — rounds a condition has been active, from the round it was
 * applied to the current one. Legacy conditions without a stamp show bare. */
function conditionLabel(c: Combatant, id: string, round: number): string {
  const name = CONDITION_NAME[id] ?? id;
  const since = c.conditionSince?.[id];
  if (!since) return name;
  const rounds = Math.max(1, round - since + 1);
  return `${name} · ${rounds}r`;
}

export function CombatantRow({
  combatant,
  hp,
  max,
  active,
  isDM,
  round,
  onPatch,
  onToggleCondition,
  onRemove,
}: {
  combatant: Combatant;
  hp: number | null;
  max: number | null;
  active: boolean;
  isDM: boolean;
  round: number;
  onPatch: (partial: Partial<Combatant>) => void;
  onToggleCondition: (conditionId: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const monster = combatant.kind === "monster";
  // Players never see a monster's health or AC — only the DM tracks those.
  const showVitals = !monster || isDM;
  const pct = max && max > 0 && hp != null ? Math.round((hp / max) * 100) : 0;
  const dead = hp != null && hp <= 0;

  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        borderColor: active ? "var(--gold)" : undefined,
        background: active ? "rgba(201,150,47,0.08)" : undefined,
        opacity: dead ? 0.6 : 1,
      }}
    >
      <div className="row between" style={{ gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>
            {active && <span className="gold">▸ </span>}
            {combatant.name}
            <span className="faint" style={{ fontSize: "0.74rem" }}>
              {" "}
              {monster ? "monster" : "hunter"}
              {dead && monster ? " · slain" : ""}
            </span>
          </div>
          <div className="faint" style={{ fontSize: "0.76rem" }}>
            Init {combatant.initiative}
            {showVitals && combatant.ac != null ? ` · AC ${combatant.ac}` : ""}
            {showVitals && hp != null && max != null ? ` · HP ${hp}/${max}` : ""}
          </div>
          {combatant.note && (
            <div className="muted" style={{ fontSize: "0.76rem", marginTop: 2 }}>{combatant.note}</div>
          )}
        </div>
        {isDM && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto", flex: "none", padding: "4px 8px" }}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {showVitals && hp != null && max != null && (
        <div style={{ height: 6, borderRadius: 6, background: "var(--bg)", overflow: "hidden", marginTop: 6 }}>
          <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: "var(--blood-bright)" }} />
        </div>
      )}

      {combatant.conditions.length > 0 && (
        <div className="chip-row" style={{ marginTop: 8 }}>
          {combatant.conditions.map((id) => (
            <span key={id} className="chip" style={{ fontSize: "0.72rem" }}>
              {conditionLabel(combatant, id, round)}
            </span>
          ))}
        </div>
      )}

      {/* Players can finish a monster off or clear it from the field. */}
      {!isDM && monster && !dead && (
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto", color: "var(--blood-bright)" }}
            onClick={() => onPatch({ currentHp: 0 })}
          >
            Slain
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto" }}
            onClick={onRemove}
          >
            Remove from battle
          </button>
        </div>
      )}
      {!isDM && monster && dead && (
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto" }}
            onClick={onRemove}
          >
            Remove from battle
          </button>
        </div>
      )}

      {isDM && open && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <Stepper label="Initiative" value={combatant.initiative} onChange={(v) => onPatch({ initiative: v })} />
          {monster && (
            <Stepper
              label="HP"
              value={combatant.currentHp ?? 0}
              suffix={` / ${combatant.maxHp ?? 0}`}
              min={0}
              maxValue={combatant.maxHp ?? undefined}
              onChange={(v) => onPatch({ currentHp: v })}
            />
          )}
          <p className="faint" style={{ fontSize: "0.72rem", margin: "8px 0 6px" }}>Conditions</p>
          <div className="chip-row">
            {CONDITIONS.map((c) => {
              const on = combatant.conditions.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`chip selectable${on ? " selected" : ""}`}
                  style={{ fontSize: "0.72rem" }}
                  onClick={() => onToggleCondition(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto", marginTop: 10, color: "var(--blood-bright)" }}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  suffix,
  min,
  maxValue,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  maxValue?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min ?? -Infinity, Math.min(maxValue ?? Infinity, v));
  return (
    <div className="row between" style={{ gap: 8, marginBottom: 8 }}>
      <span className="faint" style={{ fontSize: "0.78rem" }}>{label}</span>
      <div className="row" style={{ gap: 6, flex: "none" }}>
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} onClick={() => onChange(clamp(value - 1))} aria-label={`decrease ${label}`}>−</button>
        <span style={{ minWidth: 44, textAlign: "center" }}>{value}{suffix}</span>
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} onClick={() => onChange(clamp(value + 1))} aria-label={`increase ${label}`}>+</button>
      </div>
    </div>
  );
}
