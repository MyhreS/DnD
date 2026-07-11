import { SearchControls } from "@/components/SearchControls";
import { bodySnippet } from "@/lib/search";
import { HANDBOOK_GROUPS, type HandbookHit } from "../lib/handbookIndex";
import type { useHandbookSearch } from "../hooks/useHandbookSearch";

/** The Handbook's search box + group chips, and — while a query is active —
 * the ranked result cards. Clicking a result jumps into the content. */
export function HandbookSearch({
  search,
  onOpen,
}: {
  search: ReturnType<typeof useHandbookSearch>;
  onOpen: (hit: HandbookHit) => void;
}) {
  const { query, setQuery, group, setGroup, active, results } = search;
  return (
    <div className="stack" style={{ gap: 12, marginBottom: active ? 0 : 14 }}>
      <SearchControls
        query={query}
        onQuery={setQuery}
        placeholder="Search the handbook… (e.g. sanity, stalker, studs)"
        categories={HANDBOOK_GROUPS}
        category={group}
        onCategory={setGroup}
        showCategories={active}
      />
      {active &&
        (results.length === 0 ? (
          <p className="faint">Nothing in the handbook matches “{query}”.</p>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {results.map((h) => (
              <ResultCard key={h.id} hit={h} query={query} onOpen={() => onOpen(h)} />
            ))}
          </div>
        ))}
    </div>
  );
}

function ResultCard({
  hit,
  query,
  onOpen,
}: {
  hit: HandbookHit;
  query: string;
  onOpen: () => void;
}) {
  // When the match lives in the body (not the title), show where it hit.
  const snip = bodySnippet(hit, query);
  return (
    <button
      type="button"
      className="card card-hover"
      onClick={onOpen}
      style={{ textAlign: "left", color: "inherit", width: "100%" }}
    >
      <div className="row between" style={{ gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: "1.02rem" }}>{hit.term}</h3>
        <span className="chip" style={{ flex: "none", fontSize: "0.7rem" }}>{hit.group}</span>
      </div>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.86rem" }}>{hit.context}</p>
      {snip && (
        <p className="faint" style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>
          {snip.before}
          <strong className="gold">{snip.match}</strong>
          {snip.after}
        </p>
      )}
      <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>Open →</div>
    </button>
  );
}
