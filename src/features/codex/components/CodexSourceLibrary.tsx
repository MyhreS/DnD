import { Link } from "react-router-dom";
import { CODEX_SOURCES } from "@/data/codex";

const DOCUMENT_SOURCE_ORDER = [
  "core-rulebook",
  "book-of-the-deepcaller",
  "character-sheet",
  "whispers",
];
const DOCUMENT_SOURCE_RANK = new Map(DOCUMENT_SOURCE_ORDER.map((id, index) => [id, index]));
const DOCUMENT_SOURCES = [...CODEX_SOURCES].sort((left, right) =>
  (DOCUMENT_SOURCE_RANK.get(left.id) ?? Number.MAX_SAFE_INTEGER)
  - (DOCUMENT_SOURCE_RANK.get(right.id) ?? Number.MAX_SAFE_INTEGER),
);

export function SourceLibrary() {
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
                {` · ${item.downloads.length} downloadable ${item.downloads.length === 1 ? "document" : "documents"}`}
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
