import { useState } from "react";
import { PaperSheetModal } from "./papersheet/PaperSheetModal";
import { cardClassName } from "../lib/papersheet";
import type { HunterCard } from "@/types";

/** The canonical Hunter detail view: a small summary card with the character
 * sheet opening above it when the Hunter is selected. */
export function SheetCharacterView({
  card,
  autoOpen = true,
  onDismiss,
}: {
  card: HunterCard;
  /** Open the character sheet immediately when the Hunter is selected. */
  autoOpen?: boolean;
  /** Called when the popup closes, so the caller can stop re-auto-opening. */
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(autoOpen);
  const cls = cardClassName(card);

  function close() {
    setOpen(false);
    onDismiss?.();
  }
  return (
    <>
      <div className="card">
        <p className="eyebrow" style={{ margin: 0 }}>Character</p>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.15rem" }}>
          {card.name || "Unnamed hunter"}
        </div>
        <p className="faint" style={{ fontSize: "0.84rem", margin: "2px 0 0" }}>
          {cls ? `${cls} · ` : ""}Level {card.level} · character sheet
        </p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
          Open character
        </button>
      </div>
      {open && <PaperSheetModal card={card} onClose={close} />}
    </>
  );
}
