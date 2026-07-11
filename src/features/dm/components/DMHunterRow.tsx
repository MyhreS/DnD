import { useState } from "react";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import { cardClassName } from "@/features/hunter/lib/papersheet";
import { ChevronIcon } from "@/components/icons";
import type { HunterCard } from "@/types";

/** One hunter in the DM overview — tap to open the read-only paper sheet
 * (the same mechanism the Party page uses to view someone else's hunter). */
export function DMHunterRow({ card }: { card: HunterCard }) {
  const [show, setShow] = useState(false);
  const cls = cardClassName(card);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setShow(true)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: 0,
          color: "var(--ink)",
          padding: 16,
          cursor: "pointer",
        }}
      >
        <div className="row between">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {card.name || "Unnamed hunter"}
            </div>
            <div className="gold" style={{ fontSize: "0.84rem" }}>
              {cls ? `${cls} · ` : ""}Lvl {card.level}
              <span className="faint"> · {card.ownerName}</span>
            </div>
          </div>
          <ChevronIcon
            width={18}
            height={18}
            style={{ color: "var(--gold-dim)", flex: "none" }}
          />
        </div>
      </button>
      {show && <PaperSheetModal card={card} readOnly onClose={() => setShow(false)} />}
    </div>
  );
}
