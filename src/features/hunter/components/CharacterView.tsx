import { HunterCardView } from "./HunterCardView";
import { CharacterTrackers } from "./CharacterTrackers";
import { InventorySection } from "./sheet/InventorySection";
import { SheetCharacterView } from "./SheetCharacterView";
import { CharacterLog } from "@/features/log/components/CharacterLog";
import { LevelUpModal } from "./LevelUpModal";
import { patchCharacter } from "@/api/players";
import { isSheetCard } from "@/lib/character";
import { exportCharacterPdf } from "../lib/characterPdf";
import { AsyncButton } from "@/components/AsyncButton";
import type { HunterCard } from "@/types";

/** The /character "viewing" screen: the hunter switcher plus either the play
 * sheet (builder-made hunters) or the paper-sheet popup (sheet-made ones). */
export function CharacterView({
  card,
  characters,
  selectedId,
  sheetDismissedId,
  onSelect,
  onEdit,
  onNew,
  onSheetDismiss,
  onDelete,
}: {
  card: HunterCard | null;
  characters: HunterCard[];
  selectedId: string | null;
  /** The sheet hunter whose popup the user just closed — don't re-open it. */
  sheetDismissedId: string | null;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onNew: () => void;
  onSheetDismiss: (id: string) => void;
  onDelete: () => Promise<boolean>;
}) {
  const sheetCard = card && isSheetCard(card) ? card : null;
  const hasCard = !!card && !!card.classId && !!card.name;

  return (
    <div>
      <div className="row between no-print" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Your Hunter</p>
          <h1 className="page-title" style={{ margin: 0 }}>Character</h1>
        </div>
        {!sheetCard && (
          <div className="row" style={{ gap: 8 }}>
            <AsyncButton className="btn-ghost btn-sm" pendingText="Generating…" showDone={false} onClick={() => exportCharacterPdf(card!)}>
              Export PDF
            </AsyncButton>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          </div>
        )}
      </div>

      <div className="chip-row no-print" style={{ marginBottom: 14 }}>
        {characters.map((c) => (
          <button
            key={c.id}
            className={`chip selectable${c.id === selectedId ? " selected" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            {c.name || "Unnamed"}
          </button>
        ))}
        <button className="chip selectable" onClick={onNew}>+ New hunter</button>
      </div>

      {sheetCard ? (
        <SheetCharacterView
          key={sheetCard.id}
          card={sheetCard}
          autoOpen={sheetCard.id !== sheetDismissedId}
          onDismiss={() => onSheetDismiss(sheetCard.id)}
          onDelete={onDelete}
        />
      ) : (
        <>
          {hasCard && (
            <div className="card no-print row between" style={{ marginBottom: 14, alignItems: "center" }}>
              <div>
                <span className="eyebrow" style={{ margin: 0 }}>Level</span>
                <div className="faint" style={{ fontSize: "0.78rem" }}>
                  The DM rewards Insight and levels — they arrive here.
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", flex: "none" }}>
                {card!.level}
              </span>
            </div>
          )}

          {hasCard && card!.lastSeenLevel != null && card!.level > card!.lastSeenLevel && (
            // Partial patch (not a full-card save) so a concurrent DM award —
            // insight, gold, HP — is never clobbered by this client's snapshot.
            <LevelUpModal card={card!} onPatch={(p) => void patchCharacter(card!.id, p)} />
          )}

          {hasCard ? (
            <div className="desk-2col">
              <aside className="desk-aside no-print">
                <CharacterTrackers card={card!} />
              </aside>
              <div className="desk-main">
                <div className="print-sheet">
                  <HunterCardView card={card!} onPatch={(p) => void patchCharacter(card!.id, p)} />
                </div>
                <div className="no-print" style={{ marginTop: 14 }}>
                  <InventorySection card={card!} onPatch={(p) => void patchCharacter(card!.id, p)} />
                </div>
                <div className="no-print" style={{ marginTop: 14 }}>
                  <CharacterLog card={card!} />
                </div>
              </div>
            </div>
          ) : (
            <div className="card center">
              <p className="muted" style={{ margin: 0 }}>This hunter is a draft — tap Edit to finish it.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
