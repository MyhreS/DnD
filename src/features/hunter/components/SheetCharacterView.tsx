import { useState } from "react";
import { PaperSheetModal } from "./papersheet/PaperSheetModal";
import { cardClassName } from "../lib/papersheet";
import type { HunterCard } from "@/types";

/** The view for a sheet-made hunter: a small summary card, with the editor
 * popping up on top (auto-opened when the hunter is first viewed —
 * key this component by card id). */
export function SheetCharacterView({
  card,
  autoOpen = true,
  onDismiss,
  onDelete,
}: {
  card: HunterCard;
  /** Pop the sheet open immediately (the "view a sheet character" behaviour). */
  autoOpen?: boolean;
  /** Called when the popup closes, so the caller can stop re-auto-opening. */
  onDismiss?: () => void;
  /** When given, offers deletion inside the editor (main-menu Hunters only). */
  onDelete?: (card: HunterCard) => Promise<boolean>;
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
          {cls ? `${cls} · ` : ""}Level {card.level} · app and paper views
        </p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
          Open character
        </button>
      </div>
      {open && <PaperSheetModal card={card} onClose={close} onDelete={onDelete} />}
    </>
  );
}
