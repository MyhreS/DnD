import type { ArmorPiece, HunterCard } from "@/types";
import { ARMOR_BY_ID } from "@/data/armor";
import { armorClassFor } from "@/lib/character";
import { carryCondition, totalCarriedWeight } from "@/lib/inventory";

/** The sheet's top summary strip (wireframe top row): Total AC + the
 * auto-derived Shield Arm check; Armor Category + total carried weight +
 * weight condition (ALWAYS visible, #134/#138); Impressions from worn extras. */
export function AcWeightSummary({ card }: { card: HunterCard }) {
  const ac = armorClassFor(card);
  const weight = totalCarriedWeight(card);
  const cond = carryCondition(card.abilities.str, weight);
  const impressions = (card.extraArmorIds ?? [])
    .map((id) => ARMOR_BY_ID[id])
    .filter((p): p is ArmorPiece => !!p?.impression);

  return (
    <div className="card sheet-summary">
      <div className="row" style={{ gap: 12, alignItems: "stretch" }}>
        <div className="stat" style={{ minWidth: 92 }}>
          <div className="stat-label">Armor Class</div>
          <div className="stat-value" style={{ fontSize: "2rem" }}>{ac.total}</div>
          <div className="stat-sub">{ac.category}</div>
        </div>
        <div className="stack" style={{ gap: 4, justifyContent: "center" }}>
          <span
            className={ac.shieldArm ? "gold" : "faint"}
            style={{ fontSize: "0.86rem", fontWeight: 600 }}
            title="A pauldron + vambrace on the same arm — auto-derived from the worn Add-ons."
          >
            {ac.shieldArm ? "☑" : "☐"} Shield Arm
          </span>
          <span className="faint" style={{ fontSize: "0.74rem" }}>
            {ac.dexRule}
          </span>
        </div>
      </div>

      <div className="stack" style={{ gap: 2, justifyContent: "center" }}>
        <div className="row between" style={{ gap: 10 }}>
          <span className="faint" style={{ fontSize: "0.82rem" }}>Carried weight</span>
          <span style={{ fontFamily: "var(--font-display)" }}>{weight} lb</span>
        </div>
        <div className="row between" style={{ gap: 10 }}>
          <span className="faint" style={{ fontSize: "0.82rem" }}>Condition</span>
          <span className={cond.speedDelta < 0 || cond.label === "Over Capacity" ? "blood" : "gold"} style={{ fontWeight: 600, fontSize: "0.92rem" }}>
            {cond.label}
          </span>
        </div>
        <p className="faint" style={{ fontSize: "0.74rem", margin: "2px 0 0" }}>{cond.note}</p>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Impressions</p>
        {impressions.length === 0 ? (
          <p className="faint" style={{ fontSize: "0.82rem", margin: 0 }}>
            No particular impression.
          </p>
        ) : (
          impressions.map((p) => (
            <p key={p.id} className="muted" style={{ fontSize: "0.84rem", margin: "0 0 2px" }}>
              <span className="gold">{p.name}</span> — {p.impression}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
