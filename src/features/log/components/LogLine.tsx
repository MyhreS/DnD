import { typeGlyph, timeLabel } from "../lib/format";
import type { ActivityEvent } from "@/types";

/** One chronicle line — shared by the Log page, the in-game log and the
 * character log. */
export function LogLine({ event }: { event: ActivityEvent }) {
  return (
    <div
      className="row"
      style={{
        gap: 10,
        alignItems: "baseline",
        padding: "9px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span className="gold" aria-hidden style={{ flex: "none", width: 16, textAlign: "center" }}>
        {typeGlyph(event.type)}
      </span>
      <span style={{ fontSize: "0.9rem", minWidth: 0 }}>{event.message}</span>
      <span className="faint" style={{ flex: "none", marginLeft: "auto", fontSize: "0.75rem" }}>
        {timeLabel(event.at)}
      </span>
    </div>
  );
}
