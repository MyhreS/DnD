import { Fragment } from "react";
import { highlightSegments } from "@/lib/search";
import type { RuleEntry } from "@/types";

/** A rule card shows its full body, so instead of a snippet the query's
 * matches are bolded in place — the reader sees exactly why it surfaced. */
export function RuleEntryCard({ entry, query = "" }: { entry: RuleEntry; query?: string }) {
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 4, gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{entry.term}</h3>
        <span className="chip" style={{ flex: "none", fontSize: "0.7rem" }}>{entry.category}</span>
      </div>
      {entry.body.map((p, i) => (
        <p key={i} className="muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
          <Highlighted text={p} query={query} />
        </p>
      ))}
    </div>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return text;
  return highlightSegments(text, query).map((s, i) =>
    s.hit ? (
      <strong key={i} className="gold">
        {s.text}
      </strong>
    ) : (
      <Fragment key={i}>{s.text}</Fragment>
    ),
  );
}
