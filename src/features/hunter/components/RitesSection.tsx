import { useState } from "react";
import type { HunterCard } from "@/types";
import { RITES, RITE_BY_ID } from "@/data/rites";
import { getClass } from "@/data/classes";
import { riteStats, isZealot } from "@/lib/character";
import { formatModifier } from "@/data/abilities";
import { AsyncButton } from "@/components/AsyncButton";
import { openDocument } from "@/features/handbook/lib/handbookPdf";
import { DEEPCALLER_BOOK_PDF_PATH } from "@/data/handbook";

/** The Deepcaller's tome catalog item — carrying it unlocks the in-app book. */
const DEEPCALLER_BOOK_ID = "book-of-eldritch-knowledge";

/** How many Whispers this hunter may prepare: the class table's "Prepared
 * Whispers" for the level, +1 for a Hunter Zealot (Zealot Whispers). */
function whisperCap(card: HunterCard): number {
  const klass = getClass(card.classId);
  const row = klass?.progression.find((r) => r.level === Math.max(1, Math.min(20, card.level)));
  const base = parseInt(row?.extras["Prepared Whispers"] ?? "2", 10) || 2;
  return base + (isZealot(card) ? 1 : 0);
}

export function RitesSection({
  card,
  lvl,
  onPatch,
}: {
  card: HunterCard;
  lvl: number;
  /** When provided the section is editable: prepare/unprepare Whispers. */
  onPatch?: (p: Partial<HunterCard>) => void;
}) {
  const [managing, setManaging] = useState(false);
  const r = riteStats(card.abilities, lvl);
  const preparedIds = card.preparedWhispers ?? [];
  const prepared = preparedIds.map((id) => RITE_BY_ID[id]).filter(Boolean);
  const hasBook = (card.inventory ?? []).some((e) => e.itemId === DEEPCALLER_BOOK_ID);
  const zealot = isZealot(card);
  const cap = whisperCap(card);

  // Whispers proper — plus, for a Zealot, Level 1 Rites (Zealot Whispers).
  const preparable = RITES.filter((x) => x.whisper || (zealot && x.level === 1));

  function toggle(id: string) {
    if (!onPatch) return;
    const has = preparedIds.includes(id);
    if (!has && preparedIds.length >= cap) return;
    onPatch({
      preparedWhispers: has ? preparedIds.filter((x) => x !== id) : [...preparedIds, id],
    });
  }

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
      {zealot ? (
        <p className="faint" style={{ fontSize: "0.82rem", margin: 0 }}>
          Your Book is burned — your Patron speaks the words now. Whispers only.
        </p>
      ) : hasBook ? (
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
      <div className="row between" style={{ marginBottom: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>
          Prepared Whispers <span className="faint">({preparedIds.length}/{cap})</span>
        </p>
        {onPatch && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto", flex: "none" }}
            onClick={() => setManaging((m) => !m)}
          >
            {managing ? "Done" : "Manage"}
          </button>
        )}
      </div>

      {managing && onPatch ? (
        <div className="stack" style={{ gap: 4 }}>
          {preparable.map((rite) => {
            const on = preparedIds.includes(rite.id);
            const atCap = !on && preparedIds.length >= cap;
            return (
              <button
                key={rite.id}
                type="button"
                className="row between card-hover"
                style={{
                  background: on ? "rgba(179,18,26,0.12)" : "var(--bg-elev-2)",
                  border: `1px solid ${on ? "var(--blood-bright)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  gap: 8,
                  textAlign: "left",
                  opacity: atCap ? 0.55 : 1,
                }}
                onClick={() => toggle(rite.id)}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{rite.name}</span>{" "}
                  <span className="faint" style={{ fontSize: "0.74rem" }}>
                    {rite.whisper ? "Whisper" : "Lv 1 Rite → Zealot Whisper"} · {rite.type}
                  </span>
                </span>
                <span className="gold" style={{ flex: "none", fontSize: "0.82rem" }}>
                  {on ? "Prepared ✓" : atCap ? "At cap" : "Prepare"}
                </span>
              </button>
            );
          })}
        </div>
      ) : prepared.length ? (
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
          None prepared.{onPatch ? " Tap Manage to choose your Whispers." : ""}
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
