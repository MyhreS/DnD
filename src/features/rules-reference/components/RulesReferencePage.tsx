import { RULE_CATEGORIES } from "@/data/rulesReference";
import { useRuleSearch } from "../hooks/useRuleSearch";
import { RuleEntryCard } from "./RuleEntryCard";

/** Searchable 5e (2024) rules glossary — conditions, actions, combat terms. */
export function RulesReferencePage() {
  const { query, setQuery, category, setCategory, results } = useRuleSearch();

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div>
        <p className="eyebrow">Reference</p>
        <h1 style={{ margin: 0 }}>Rules Reference</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
          The 5e (2024) glossary — conditions, actions, and combat terms. Search anything.
        </p>
      </div>

      <input
        className="input"
        type="search"
        placeholder="Search rules… (e.g. grapple, frightened, cover)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chip-row">
        <button
          type="button"
          className={`chip selectable${category === "all" ? " selected" : ""}`}
          onClick={() => setCategory("all")}
        >
          All
        </button>
        {RULE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip selectable${category === c ? " selected" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="faint">No rules match “{query}”.</p>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {results.map((e) => (
            <RuleEntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
