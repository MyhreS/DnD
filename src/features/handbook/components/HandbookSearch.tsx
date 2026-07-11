import { SearchControls } from "@/components/SearchControls";
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
              <ResultCard key={h.id} hit={h} onOpen={() => onOpen(h)} />
            ))}
          </div>
        ))}
    </div>
  );
}

function ResultCard({ hit, onOpen }: { hit: HandbookHit; onOpen: () => void }) {
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
      <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>Open →</div>
    </button>
  );
}
