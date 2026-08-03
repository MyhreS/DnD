import { Fragment, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CODEX_GROUPS,
  CODEX_SOURCE_BY_ID,
  CODEX_SOURCES,
  CODEX_TOPICS,
  type CodexEntry,
  type CodexTopic,
} from "@/data/codex";
import { bodySnippet, highlightSegments, normalizeText, searchEntries } from "@/lib/search";

const MAX_RESULTS = 100;
const DOCUMENT_SOURCE_ORDER = [
  "handbook",
  "character-sheets",
  "game-card",
  "rules-reference-scan",
  "ability-point-costs-v2",
  "bloodbound",
  "brute",
  "deepcaller",
  "scout",
  "stalker",
  "warden",
  "rites-by-school",
  "book-of-deepcaller",
  "whispers",
  "transformation-table",
  "master-notes",
];
const DOCUMENT_SOURCE_RANK = new Map(DOCUMENT_SOURCE_ORDER.map((id, index) => [id, index]));
const DOCUMENT_SOURCES = [...CODEX_SOURCES].sort((left, right) =>
  (DOCUMENT_SOURCE_RANK.get(left.id) ?? Number.MAX_SAFE_INTEGER)
  - (DOCUMENT_SOURCE_RANK.get(right.id) ?? Number.MAX_SAFE_INTEGER),
);

export function CodexDocumentsPage() {
  return (
    <div className="codex-page">
      <Link className="codex-back-link" to="/codex">← Back to Codex</Link>
      <header className="codex-heading codex-documents-heading">
        <p className="eyebrow">Documents</p>
        <h1>Source library</h1>
        <p>Player handbooks, character sheets, class boards, rules references, and game aids. Each source remains separate so its origin is always clear.</p>
      </header>
      <SourceLibrary />
    </div>
  );
}

export function CodexPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sourceId = CODEX_SOURCE_BY_ID.has(params.get("source") ?? "") ? params.get("source") ?? "" : "";
  const group = CODEX_GROUPS.includes(params.get("group") ?? "") ? params.get("group") ?? "" : "";

  const candidates = useMemo(() => CODEX_TOPICS.flatMap((topic) => {
      const versions = topic.versions.filter((version) =>
        (!sourceId || version.sourceId === sourceId) && (!group || version.group === group),
      );
      if (versions.length === 0) return [];
      return [{
        ...topic,
        aliases: [...new Set(versions.flatMap((version) => version.aliases))],
        body: versions.flatMap((version) => version.body),
        groups: [...new Set(versions.map((version) => version.group))],
        versions,
      }];
    }), [group, sourceId]);

  const results = useMemo(() => {
    if (!query.trim() && !sourceId && !group) return [];
    return searchEntries(candidates, query).slice(0, MAX_RESULTS);
  }, [candidates, group, query, sourceId]);

  function setParam(name: "q" | "source" | "group", value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      if (name === "source" && value) next.delete("group");
      if (name === "group" && value) next.delete("source");
      return next;
    }, { replace: true });
  }

  const active = Boolean(query.trim() || sourceId || group);
  const selectedLabel = sourceId
    ? CODEX_SOURCE_BY_ID.get(sourceId)?.shortLabel
    : group || "All sources";

  return (
    <div className="codex-page">
      <header className="codex-heading">
        <p className="eyebrow">One searchable library</p>
        <h1>Codex</h1>
        <p>Handbook, D&amp;D rules, class boards, rites, character guidance, and the Player&rsquo;s Game Card—together, with every source kept visible.</p>
      </header>

      <div className="codex-search" role="search">
        <label htmlFor="codex-query">Search every rule and reference</label>
        <input
          id="codex-query"
          className="input"
          type="search"
          placeholder="Try grapple, sanity, Hunter Rifle, or Blood Frenzy…"
          value={query}
          onChange={(event) => setParam("q", event.target.value)}
          autoComplete="off"
        />
        <div className="codex-filter-row">
          <label htmlFor="codex-source">Search within</label>
          <select
            id="codex-source"
            className="input"
            value={sourceId}
            onChange={(event) => setParam("source", event.target.value)}
          >
            <option value="">All sources</option>
            {CODEX_SOURCES.map((item) => <option key={item.id} value={item.id}>{item.shortLabel}</option>)}
          </select>
          {active && (
            <button type="button" className="codex-clear" onClick={() => setParams({}, { replace: true })}>
              Clear
            </button>
          )}
        </div>
      </div>

      {!active ? (
        <CodexHome onBrowse={(nextGroup) => setParam("group", nextGroup)} />
      ) : (
        <section className="codex-results" aria-labelledby="codex-results-title">
          <div className="codex-results-heading">
            <div>
              <p className="eyebrow">{selectedLabel}</p>
              <h2 id="codex-results-title">{query ? `Results for “${query}”` : "Browse entries"}</h2>
            </div>
            <span aria-live="polite">{results.length}{results.length === MAX_RESULTS ? "+" : ""} {results.length === 1 ? "topic" : "topics"}</span>
          </div>
          {results.length === 0 ? (
            <p className="codex-empty" data-testid="codex-empty">No Codex entries match this search and source.</p>
          ) : (
            <div className="codex-topic-list">
              {results.map((topic) => <CodexTopicRow key={topic.topicKey} topic={topic} query={query} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CodexHome({ onBrowse }: { onBrowse: (group: string) => void }) {
  const groupedCounts = new Map<string, number>();
  for (const topic of CODEX_TOPICS) {
    for (const group of topic.groups) groupedCounts.set(group, (groupedCounts.get(group) ?? 0) + 1);
  }

  return (
    <section className="codex-browse" aria-labelledby="codex-browse-title">
      <div className="codex-section-heading">
        <p className="eyebrow">Browse</p>
        <h2 id="codex-browse-title">Start with a part of the library</h2>
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
          <small>{CODEX_SOURCES.length} sources · {CODEX_SOURCES.flatMap((source) => source.downloads).length} PDFs</small>
        </Link>
      </div>
    </section>
  );
}

function SourceLibrary() {
  return (
    <section className="codex-sources codex-sources-page" aria-label="Source documents">
      <div className="codex-source-list">
        {DOCUMENT_SOURCES.map((item, index) => (
          <article data-testid="codex-document" key={item.id}>
            <div>
              <span className="codex-document-index">Document {String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>
                {item.pageCount > 0 ? `${item.pageCount} ${item.pageCount === 1 ? "page" : "pages"}` : "Structured record"}
                {` · ${item.downloads.length} downloadable ${item.downloads.length === 1 ? "PDF" : "PDFs"}`}
              </small>
            </div>
            <div className="codex-source-actions">
              <Link to={`/codex?source=${encodeURIComponent(item.id)}`}>Search in Codex</Link>
              {item.downloads.map((download) => (
                <a download href={download.publicPath} key={download.publicPath}>Download {download.label}</a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CodexTopicRow({ topic, query }: { topic: CodexTopic; query: string }) {
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
          <a href={`${sourcePath}${entry.sourcePages?.[0] ? `#page=${entry.sourcePages[0]}` : ""}`} target="_blank" rel="noreferrer">
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

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return text;
  return highlightSegments(text, query).map((segment, index) =>
    segment.hit ? <mark key={index}>{segment.text}</mark> : <Fragment key={index}>{segment.text}</Fragment>,
  );
}
