import { useState } from "react";

const COLLAPSE_AFTER = 700;

export function MessageBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const characters = Array.from(body);
  const isLong = characters.length > COLLAPSE_AFTER;
  const visibleBody = isLong && !expanded
    ? `${characters.slice(0, COLLAPSE_AFTER).join("").trimEnd()} […]`
    : body;

  return (
    <div className="message-body">
      <p>{visibleBody}</p>
      {isLong && (
        <button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
          {expanded ? "Show less" : "Show full message"}
        </button>
      )}
    </div>
  );
}
