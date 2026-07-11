/** The shared search control: a search box plus an "All" + category chip row.
 * Rendered identically by the Rules page and the Handbook search. */
export function SearchControls<C extends string>({
  query,
  onQuery,
  placeholder,
  categories,
  category,
  onCategory,
  showCategories = true,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  categories: readonly C[];
  category: C | "all";
  onCategory: (c: C | "all") => void;
  /** Hide the chip row (e.g. until a query is active). */
  showCategories?: boolean;
}) {
  return (
    <>
      <input
        className="input"
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      {showCategories && (
        <div className="chip-row">
          <button
            type="button"
            className={`chip selectable${category === "all" ? " selected" : ""}`}
            onClick={() => onCategory("all")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip selectable${category === c ? " selected" : ""}`}
              onClick={() => onCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
