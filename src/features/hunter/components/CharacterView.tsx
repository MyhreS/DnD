import { SheetCharacterView } from "./SheetCharacterView";
import { CharacterLog } from "@/features/log/components/CharacterLog";
import type { HunterCard } from "@/types";

/** The /character "viewing" screen: the hunter switcher, the paper-sheet
 * popup (every hunter IS a paper sheet) and the hunter's history below. */
export function CharacterView({
  card,
  characters,
  selectedId,
  sheetDismissedId,
  onSelect,
  onNew,
  onSheetDismiss,
  onDelete,
}: {
  card: HunterCard | null;
  characters: HunterCard[];
  selectedId: string | null;
  /** The hunter whose popup the user just closed — don't re-open it. */
  sheetDismissedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSheetDismiss: (id: string) => void;
  onDelete: () => Promise<boolean>;
}) {
  return (
    <div>
      <div className="no-print" style={{ marginBottom: 12 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Your Hunter</p>
        <h1 className="page-title" style={{ margin: 0 }}>Character</h1>
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

      {card && (
        <>
          <SheetCharacterView
            key={card.id}
            card={card}
            autoOpen={card.id !== sheetDismissedId}
            onDismiss={() => onSheetDismiss(card.id)}
            onDelete={onDelete}
          />
          <div className="no-print" style={{ marginTop: 14 }}>
            <CharacterLog card={card} />
          </div>
        </>
      )}
    </div>
  );
}
