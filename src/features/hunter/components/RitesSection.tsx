import type { HunterCard } from "@/types";
import { RITE_BY_ID } from "@/data/rites";
import { riteStats } from "@/lib/character";
import { formatModifier } from "@/data/abilities";
import { AsyncButton } from "@/components/AsyncButton";
import { openDocument } from "@/features/handbook/lib/handbookPdf";
import { DEEPCALLER_BOOK_PDF_PATH } from "@/data/handbook";

/** The Deepcaller's tome catalog item — carrying it unlocks the in-app book. */
const DEEPCALLER_BOOK_ID = "book-of-eldritch-knowledge";

export function RitesSection({ card, lvl }: { card: HunterCard; lvl: number }) {
  const r = riteStats(card.abilities, lvl);
  const prepared = (card.preparedWhispers ?? []).map((id) => RITE_BY_ID[id]).filter(Boolean);
  const hasBook = (card.inventory ?? []).some((e) => e.itemId === DEEPCALLER_BOOK_ID);

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Rites</p>
      <div className="derived-grid">
        <Stat label="Ability" value="INT" />
        <Stat label="Rite Mod." value={formatModifier(r.modifier)} />
        <Stat label="Save DC" value={r.saveDc} />
        <Stat label="Attack" value={formatModifier(r.attack)} />
      </div>

      <hr className="divider" />
      {hasBook ? (
        <AsyncButton
          className="btn btn-ghost"
          pendingText="Opening…"
          showDone={false}
          onClick={() =>
            openDocument(DEEPCALLER_BOOK_PDF_PATH, "Book-of-the-Deepcaller.pdf", "Book of the Deepcaller")
          }
        >
          Open the Book of the Deepcaller
        </AsyncButton>
      ) : (
        <p className="faint" style={{ fontSize: "0.82rem", margin: 0 }}>
          Carry the Book of the Deepcaller to open it.
        </p>
      )}

      <hr className="divider" />
      <p className="eyebrow" style={{ marginBottom: 8 }}>Prepared Whispers</p>
      {prepared.length ? (
        <ul className="list-reset pill-list">
          {prepared.map((rite) => (
            <li key={rite.id}>
              <div className="row between">
                <span style={{ fontWeight: 600 }}>{rite.name}</span>
                <span className="gold" style={{ flex: "none", fontSize: "0.78rem" }}>
                  {rite.whisper ? "Whisper" : `Lv ${rite.level}`} · {rite.type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="faint" style={{ fontSize: "0.86rem", margin: 0 }}>
          None prepared. Browse the Book of the Deepcaller in the Handbook → Rites.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
