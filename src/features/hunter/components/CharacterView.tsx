import { useSettings } from "@/app/settings";
import { HunterListCard } from "./HunterListCard";
import { SheetCharacterView } from "./SheetCharacterView";
import { CharacterLog } from "@/features/log/components/CharacterLog";
import type { HunterCard } from "@/types";

/** The /character "Hunters" screen. It ALWAYS lands on the LIST of your hunters
 * (it never auto-opens one); click a card to view/edit that hunter's paper
 * sheet. The cross-campaign log is experimental — hidden unless enabled. */
export function CharacterView({
  characters,
  openId,
  onOpen,
  onBack,
  onNew,
  onDelete,
}: {
  characters: HunterCard[];
  /** The hunter currently opened (detail view), or null while showing the list. */
  openId: string | null;
  onOpen: (id: string) => void;
  onBack: () => void;
  onNew: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const experimental = useSettings((s) => s.experimental);
  const openCard = openId ? characters.find((c) => c.id === openId) ?? null : null;

  // Detail: a single opened hunter — the paper sheet (view/edit) auto-pops, with
  // deletion below and (experimental only) its cross-campaign log. This is the
  // old "view a hunter" behaviour, now reached only by clicking a card.
  if (openCard) {
    return (
      <div>
        <button
          className="btn btn-ghost btn-sm no-print"
          style={{ width: "auto", marginBottom: 12 }}
          onClick={onBack}
        >
          ← All hunters
        </button>
        <SheetCharacterView
          key={openCard.id}
          card={openCard}
          autoOpen
          onDismiss={onBack}
          onDelete={onDelete}
        />
        {experimental && (
          <div className="no-print" style={{ marginTop: 14 }}>
            <CharacterLog card={openCard} />
          </div>
        )}
      </div>
    );
  }

  // List: every hunter as a tap-to-open card, plus a way to forge a new one.
  return (
    <div>
      <div className="no-print" style={{ marginBottom: 12 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Your hunters</p>
        <h1 className="page-title" style={{ margin: 0 }}>Hunters</h1>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {characters.map((c) => (
          <HunterListCard key={c.id} card={c} onOpen={() => onOpen(c.id)} />
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onNew}>
        Create hunter
      </button>
    </div>
  );
}
