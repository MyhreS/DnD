import { useState } from "react";
import { getClass } from "@/data/classes";
import { HunterCardView } from "@/features/hunter/components/HunterCardView";
import { ChevronIcon } from "@/components/icons";
import type { HunterCard } from "@/types";

/** A collapsible row showing one hunter; expands to the full card. */
export function HunterRow({ card }: { card: HunterCard }) {
  const [open, setOpen] = useState(false);
  const klass = getClass(card.classId);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, color: "var(--ink)", padding: 16 }}
      >
        <div className="row between">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{card.name}</div>
            <div className="gold" style={{ fontSize: "0.84rem" }}>
              {klass ? `${klass.name} · Lvl ${card.level}` : "Hunter"}
              <span className="faint"> · {card.ownerName}</span>
            </div>
          </div>
          <ChevronIcon
            width={18}
            height={18}
            style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)", flex: "none" }}
          />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }} className="fade-in">
          <HunterCardView card={card} />
        </div>
      )}
    </div>
  );
}
