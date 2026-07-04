import { useCharacterActivity } from "../hooks/useCharacterActivity";
import { typeGlyph, dayLabel, timeLabel } from "../lib/format";
import type { HunterCard } from "@/types";

/** A hunter's history across campaigns — what happened to them, where, when.
 * Shown on the owner's character page (the query is owner-scoped). */
export function CharacterHistory({ card }: { card: HunterCard }) {
  const { events, error } = useCharacterActivity(card.id, card.ownerUid);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (events === null) return null; // loading — the sheet above carries the page

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginTop: 0 }}>History</p>
      {events.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          Nothing chronicled yet — loot, gold, levels, rests and deaths land here as {card.name || "this hunter"} plays.
        </p>
      ) : (
        <div>
          {events.map((e) => (
            <div
              key={e.id}
              className="row"
              style={{ gap: 10, alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid var(--border)" }}
            >
              <span className="gold" aria-hidden style={{ flex: "none", width: 16, textAlign: "center" }}>
                {typeGlyph(e.type)}
              </span>
              <span style={{ fontSize: "0.88rem", minWidth: 0 }}>
                {e.message}
                <span className="faint" style={{ fontSize: "0.76rem" }}> — {e.campaignName}</span>
              </span>
              <span className="faint" style={{ flex: "none", marginLeft: "auto", fontSize: "0.74rem", whiteSpace: "nowrap" }}>
                {dayLabel(e.at)} · {timeLabel(e.at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
