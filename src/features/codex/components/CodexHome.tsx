import { Link } from "react-router-dom";
import { CODEX_GROUPS, CODEX_SOURCES, CODEX_TOPICS } from "@/data/codex";

export function CodexHome({ onBrowse }: { onBrowse: (group: string) => void }) {
  const groupedCounts = new Map<string, number>();
  for (const topic of CODEX_TOPICS) {
    for (const group of topic.groups) groupedCounts.set(group, (groupedCounts.get(group) ?? 0) + 1);
  }

  return (
    <section className="codex-browse" aria-labelledby="codex-browse-title">
      <div className="codex-section-heading">
        <h2 id="codex-browse-title">Browse</h2>
      </div>
      <div className="codex-collection-list">
        {CODEX_GROUPS.filter((item) => item !== "Source Notes").map((item) => (
          <button className="codex-collection-item" type="button" key={item} onClick={() => onBrowse(item)}>
            <span>{item}</span>
            <small>{groupedCounts.get(item) ?? 0} topics</small>
          </button>
        ))}
        <Link className="codex-collection-item" to="/codex/documents">
          <span>Source library</span>
          <small>{CODEX_SOURCES.length} sources · {CODEX_SOURCES.flatMap((source) => source.downloads).length} documents</small>
        </Link>
      </div>
    </section>
  );
}
