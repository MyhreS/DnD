/** Shared search field plus an optional category row. */
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
  onQuery: (query: string) => void;
  placeholder: string;
  categories: readonly C[];
  category: C | "all";
  onCategory: (category: C | "all") => void;
  showCategories?: boolean;
}) {
  return (
    <>
      <input
        className="input"
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
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
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip selectable${category === item ? " selected" : ""}`}
              onClick={() => onCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
