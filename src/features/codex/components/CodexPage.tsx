import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CODEX_GROUPS,
  CODEX_SOURCE_BY_ID,
  CODEX_TOPICS,
} from "@/data/codex";
import { searchEntries } from "@/lib/search";
import { CodexHome } from "./CodexHome";
import { CodexTopicRow } from "./CodexTopicRow";
import { SourceLibrary } from "./CodexSourceLibrary";

const MAX_RESULTS = 100;

export function CodexDocumentsPage() {
  return (
    <div className="codex-page">
      <Link className="codex-back-link" to="/codex">← Back to Codex</Link>
      <header className="codex-heading codex-documents-heading">
        <p className="eyebrow">Documents</p>
        <h1>Source library</h1>
        <p>The four current player documents supplied by the game maker. Each remains separate so its origin is always clear.</p>
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
  const resultsTitle = query
    ? `Results for “${query}”`
    : sourceId
      ? CODEX_SOURCE_BY_ID.get(sourceId)?.shortLabel ?? "Browse entries"
      : group || "Browse entries";

  return (
    <div className="codex-page">
      <header className="codex-heading">
        <p className="eyebrow">One searchable library</p>
        <h1>Codex</h1>
        <p>The Core Rulebook, Deepcaller Rites, Whispers, and the current printable character sheet—together, with every player source kept visible.</p>
      </header>

      <div className="codex-search" role="search">
        <label htmlFor="codex-query">Search every rule and reference</label>
        <div className="codex-search-row">
          <input
            id="codex-query"
            className="input"
            type="search"
            placeholder="Try Eldritch Rebuke, Mindcrack, armor, or sanity…"
            value={query}
            onChange={(event) => setParam("q", event.target.value)}
            autoComplete="off"
          />
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
            <h2 id="codex-results-title">{resultsTitle}</h2>
            <span aria-live="polite">{results.length}{results.length === MAX_RESULTS ? "+" : ""} {results.length === 1 ? "topic" : "topics"}</span>
          </div>
          {results.length === 0 ? (
            <p className="codex-empty" data-testid="codex-empty">No Codex entries match this search.</p>
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
