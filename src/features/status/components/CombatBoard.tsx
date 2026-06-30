import type { Combatant, Game, HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { maxHp } from "@/lib/character";
import { initiativeOrder } from "@/features/play/store/combatStore";
import { CONDITION_NAME } from "@/data/conditions";

/** Resolve a combatant's HP: monsters carry their own; PCs read live from the
 * HunterCard (one source of truth), mirroring the in-game CombatTracker. */
function vitals(c: Combatant, party: HunterCard[]): { hp: number | null; max: number | null } {
  if (c.kind === "monster") return { hp: c.currentHp ?? null, max: c.maxHp ?? null };
  const card = c.characterId ? party.find((p) => p.id === c.characterId) : undefined;
  if (!card) return { hp: null, max: null };
  const klass = getClass(card.classId);
  const max = klass ? maxHp(klass, card.abilities, card.level) : null;
  return { hp: card.currentHp ?? max, max };
}

/** Read-only initiative board for the big screen — order, whose turn, HP and
 * conditions for every combatant (PCs + the DM's monsters). Never writes. */
export function CombatBoard({ game, combatants, party }: { game: Game; combatants: Combatant[]; party: HunterCard[] }) {
  const order = initiativeOrder(combatants);
  if (order.length === 0) return null;
  const activeId = game.combat?.turnId ?? order[0]?.id ?? null;
  const round = game.combat?.round ?? 1;

  return (
    <div style={{ marginBottom: 28 }}>
      <p className="eyebrow" style={{ fontSize: "1.05rem", marginBottom: 12 }}>Combat · Round {round}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {order.map((c) => {
          const v = vitals(c, party);
          return <CombatRow key={c.id} c={c} hp={v.hp} max={v.max} active={c.id === activeId} />;
        })}
      </div>
    </div>
  );
}

function CombatRow({ c, hp, max, active }: { c: Combatant; hp: number | null; max: number | null; active: boolean }) {
  const dead = hp != null && hp <= 0;
  const pct = max && max > 0 && hp != null ? Math.round((hp / max) * 100) : 0;
  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        borderColor: active ? "var(--gold)" : undefined,
        background: active ? "rgba(201,150,47,0.10)" : undefined,
        opacity: dead ? 0.55 : 1,
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {active && <span className="gold">▸ </span>}
        {c.name}
        <span className="faint" style={{ fontSize: "0.8rem", marginLeft: 8 }}>
          {c.kind === "monster" ? "monster" : "hunter"}
          {dead ? " · down" : ""}
        </span>
      </div>
      <div className="faint" style={{ fontSize: "0.95rem", marginTop: 2 }}>
        Init {c.initiative}
        {c.ac != null ? ` · AC ${c.ac}` : ""}
        {hp != null && max != null ? ` · HP ${hp}/${max}` : ""}
      </div>
      {c.note && (
        <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>{c.note}</div>
      )}
      {hp != null && max != null && (
        <div style={{ height: 10, borderRadius: 6, background: "var(--bg)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: "var(--blood-bright)" }} />
        </div>
      )}
      {c.conditions.length > 0 && (
        <div className="chip-row" style={{ marginTop: 8 }}>
          {c.conditions.map((id) => (
            <span key={id} className="chip" style={{ fontSize: "0.8rem" }}>{CONDITION_NAME[id] ?? id}</span>
          ))}
        </div>
      )}
    </div>
  );
}
