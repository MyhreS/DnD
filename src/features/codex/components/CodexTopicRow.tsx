import { CODEX_SOURCE_BY_ID, type CodexEntry, type CodexTopic } from "@/data/codex";
import { bodySnippet, normalizeText } from "@/lib/search";
import { Highlighted } from "./CodexHighlighted";

export function CodexTopicRow({ topic, query }: { topic: CodexTopic; query: string }) {
  const snippet = bodySnippet(topic, query);
  const exact = query.trim() && normalizeText(topic.term) === normalizeText(query);
  const labels = topic.versions.map((version) => CODEX_SOURCE_BY_ID.get(version.sourceId)?.shortLabel ?? version.sourceId);
  const sourceCount = new Set(topic.versions.map((version) => version.sourceId)).size;
  return (
    <details className="codex-topic" open={exact || undefined} data-testid="codex-topic">
      <summary>
        <span className="codex-topic-copy">
          <strong><Highlighted text={topic.term} query={query} /></strong>
          <small>{[...new Set(labels)].join(" · ")}</small>
          {snippet && <span>{snippet.before}<mark>{snippet.match}</mark>{snippet.after}</span>}
        </span>
        <span className="codex-version-count">{sourceCount > 1 ? `${sourceCount} sources` : topic.groups[0]}</span>
      </summary>
      <div className="codex-topic-body">
        {sourceCount > 1 && (
          <p className="codex-comparison-note">This topic appears in multiple sources. Each version is shown separately so differences remain visible.</p>
        )}
        {topic.versions.map((entry) => <CodexVersion key={entry.id} entry={entry} query={query} />)}
      </div>
    </details>
  );
}

function CodexVersion({ entry, query }: { entry: CodexEntry; query: string }) {
  const source = CODEX_SOURCE_BY_ID.get(entry.sourceId);
  if (!source) return null;
  const sourcePath = source.publicPath ?? source.downloads[0]?.publicPath;
  const pages = entry.sourcePages?.length ? ` · PDF ${entry.sourcePages.length === 1 ? "p." : "pp."} ${entry.sourcePages.join("–")}` : "";
  return (
    <section className="codex-version" aria-label={`${source.shortLabel}: ${entry.locator}`}>
      <header>
        <div>
          <p>{source.shortLabel}</p>
          <small>{entry.locator}{pages}</small>
        </div>
        {sourcePath && (
          <a href={sourcePath} target="_blank" rel="noreferrer">
            View source
          </a>
        )}
      </header>
      {entry.warning && <p className="codex-warning">{entry.warning}</p>}
      {entry.paragraphs.map((paragraph, index) => <p key={index}><Highlighted text={paragraph} query={query} /></p>)}
      {entry.tables.map((item, tableIndex) => (
        <div className="codex-table-wrap" key={`${item.title ?? "table"}-${tableIndex}`}>
          <table className="codex-table">
            {item.title && <caption>{item.title}</caption>}
            <thead><tr>{item.columns.map((column) => <th key={column} scope="col"><Highlighted text={column} query={query} /></th>)}</tr></thead>
            <tbody>{item.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><Highlighted text={cell} query={query} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
      <footer>Source file: {source.fileLabels.join(" · ")}</footer>
    </section>
  );
}
