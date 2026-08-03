import { Fragment } from "react";
import { highlightSegments } from "@/lib/search";
import type { GameCardEntry as Entry } from "@/data/gameCard";

export function GameCardEntry({ entry, query }: { entry: Entry; query: string }) {
  const searching = query.trim().length > 0;

  return (
    <details
      className="game-card-entry"
      id={`game-card-${entry.id}`}
      open={searching || undefined}
      data-testid="game-card-entry"
    >
      <summary>
        <span>{entry.term}</span>
        <span className="game-card-page">PDF p. {entry.sourcePage}</span>
      </summary>
      <div className="game-card-entry-body">
        {entry.paragraphs.map((paragraph, index) => (
          <p key={index}><Highlighted text={paragraph} query={query} /></p>
        ))}
        {entry.tables?.map((table, tableIndex) => (
          <div className="game-card-table-wrap" key={`${table.caption ?? "table"}-${tableIndex}`}>
            <table className="game-card-table">
              {table.caption && <caption>{table.caption}</caption>}
              <thead>
                <tr>
                  {table.columns.map((column) => <th key={column} scope="col"><Highlighted text={column} query={query} /></th>)}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}><Highlighted text={cell} query={query} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </details>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return text;
  return highlightSegments(text, query).map((segment, index) =>
    segment.hit ? <mark key={index}>{segment.text}</mark> : <Fragment key={index}>{segment.text}</Fragment>,
  );
}
