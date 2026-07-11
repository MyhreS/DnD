import { useState } from "react";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import { cardClassName } from "@/features/hunter/lib/papersheet";
import { ChevronIcon } from "@/components/icons";
import type { HunterCard } from "@/types";

/** One hunter on the DM's board — tap to open the read-only paper sheet
 * (the same mechanism the Party page uses to view someone else's hunter).
 * `onRemove` renders a dismiss button that takes the hunter off the board. */
export function DMHunterRow({ card, onRemove }: { card: HunterCard; onRemove?: () => void }) {
  const [show, setShow] = useState(false);
  const cls = cardClassName(card);
  const name = card.name || "Unnamed hunter";

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={() => setShow(true)}
        style={{
          flex: 1,
          minWidth: 0,
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
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{name}</div>
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
      {onRemove && (
        <button
          type="button"
          aria-label={`remove ${name} from your board`}
          onClick={onRemove}
          style={{
            flex: "none",
            width: 44,
            background: "transparent",
            border: 0,
            borderLeft: "1px solid var(--border)",
            color: "var(--ink-dim)",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}
      {show && <PaperSheetModal card={card} readOnly onClose={() => setShow(false)} />}
    </div>
  );
}
