import { RULE_CATEGORIES } from "@/data/rulesReference";
import { SearchControls } from "@/components/SearchControls";
import { useRuleSearch } from "../hooks/useRuleSearch";
import { RuleEntryCard } from "./RuleEntryCard";

/** Searchable 5e (2024) rules glossary — conditions, actions, combat terms. */
export function RulesReferencePage() {
  const { query, setQuery, category, setCategory, results } = useRuleSearch();

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div>
        <p className="eyebrow">Quick Lookup</p>
        <h1 style={{ margin: 0 }}>Rules</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
          The 5e (2024) glossary — conditions, actions, and combat terms. Search anything.
        </p>
      </div>

      <SearchControls
        query={query}
        onQuery={setQuery}
        placeholder="Search rules… (e.g. grapple, frightened, cover)"
        categories={RULE_CATEGORIES}
        category={category}
        onCategory={setCategory}
      />

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
