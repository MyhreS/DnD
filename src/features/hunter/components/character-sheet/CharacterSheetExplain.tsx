import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalDialog } from "@/hooks/common/useModalDialog";
import type { Breakdown } from "../../lib/calculationBreakdowns";

/** A calculated value the player can tap to see how it is worked out. */
export function ExplainValue({ breakdown, children, className = "" }: { breakdown: Breakdown | null; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!breakdown) return <>{children}</>;
  return <>
    <button type="button" className={`sheet-explain-value ${className}`.trim()} aria-label={`${breakdown.title}: ${breakdown.total}. Show how it is calculated`} onClick={() => setOpen(true)}>
      {children}
    </button>
    {open && <ExplainSheet breakdown={breakdown} onClose={() => setOpen(false)} />}
  </>;
}

/** "[page 43]" (the rulebook reference form) reads as "page 43". */
const pages = (text: string) => text.replace(/\[page (\d+)\]/g, "page $1");

function ExplainSheet({ breakdown, onClose }: { breakdown: Breakdown; onClose: () => void }) {
  const dialogRef = useModalDialog(onClose);
  // Inside the character sheet so it takes the sheet's colours; on top of it.
  const host = document.querySelector(".character-sheet-modal") ?? document.body;
  return createPortal(
    <div className="sheet-explain-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="sheet-explain" role="dialog" aria-modal="true" aria-labelledby="sheet-explain-title" tabIndex={-1}>
        <header>
          <small>How it is calculated</small>
          <h2 id="sheet-explain-title">{breakdown.title}</h2>
          <button type="button" className="sheet-explain-close" aria-label="Close" data-dialog-initial-focus onClick={onClose}>×</button>
        </header>
        <dl>
          {breakdown.lines.map((line) => <div key={line.label}><dt>{pages(line.label)}</dt>{line.value && <dd>{line.value}</dd>}</div>)}
          <div className="is-total"><dt>{breakdown.totalLabel ?? "Total"}</dt><dd>{breakdown.total}</dd></div>
        </dl>
        {breakdown.note && <p>{pages(breakdown.note)}</p>}
      </section>
    </div>,
    host,
  );
}
