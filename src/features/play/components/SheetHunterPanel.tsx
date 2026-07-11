import { useState } from "react";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import { cardClassName } from "@/features/hunter/lib/papersheet";
import type { HunterCard } from "@/types";

/** The in-game panel for a sheet-made hunter: the paper sheet IS the tracker —
 * HP, Sanity, gear and gold live on the sheet, so play mode opens the sheet
 * instead of the structured trackers / rest / inventory panels. */
export function SheetHunterPanel({ card }: { card: HunterCard }) {
  const [open, setOpen] = useState(false);
  const cls = cardClassName(card);

  return (
    <>
      <div className="card">
        <p className="eyebrow" style={{ margin: 0 }}>Your hunter</p>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.15rem" }}>
          {card.name || "Unnamed hunter"}
        </div>
        <p className="faint" style={{ fontSize: "0.84rem", margin: "2px 0 0" }}>
          {cls ? `${cls} · ` : ""}Level {card.level}
        </p>
        <p className="muted" style={{ fontSize: "0.9rem", margin: "10px 0 0" }}>
          Your character sheet is your tracker — mark HP, Sanity and gear on the sheet as you play.
        </p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
          Open character sheet
        </button>
      </div>
      {open && <PaperSheetModal card={card} onClose={() => setOpen(false)} />}
    </>
  );
}
