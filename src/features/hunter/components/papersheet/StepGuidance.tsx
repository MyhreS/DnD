import { useState } from "react";
import { STEP_GUIDES } from "../../lib/stepGuide";

/** The step selector's companion: with a step active, a "What to do in step
 * N?" toolbar button opens a compact panel (styled like the sheet's info
 * popovers) with the step's to-do list and an "Open in Handbook" deep link
 * (new tab, like the info dots). The panel is anchored to the toolbar — never
 * inside a page — so the pages' overflow:hidden can't clip it. */
export function StepGuidance({ step }: { step: number }) {
  const guide = STEP_GUIDES[step];
  const [open, setOpen] = useState(false);
  if (!guide) return null;
  return (
    <>
      <button
        type="button"
        className="ghost stepguide-btn"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        What to do in step {step}?
      </button>
      {open && (
        <div className="stepguide-pop" role="note" aria-label={guide.title}>
          <b>{guide.title}</b>
          <ol>
            {guide.todo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <span className="stepguide-ref">{guide.refTitle}</span>
          <a href={guide.link} target="_blank" rel="noopener noreferrer">
            Open in Handbook ↗
          </a>
        </div>
      )}
    </>
  );
}
