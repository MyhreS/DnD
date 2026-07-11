import { useState } from "react";
import { HANDBOOK } from "@/data/handbook";
import { ChevronIcon } from "@/components/icons";
import { useScrollToSection, sectionSlug } from "../hooks/useHandbookIntent";

/** The rules chapters (creation steps, AC, carrying, Sanity) as an accordion.
 * A focused chapter/section (deep link or search hit) opens + scrolls there. */
export function ChaptersTab({
  focusChapter,
  focusSection,
}: {
  focusChapter: string | null;
  focusSection: string | null;
}) {
  const focused = HANDBOOK.some((c) => c.id === focusChapter) ? focusChapter : null;
  const [open, setOpen] = useState<string | null>(focused ?? HANDBOOK[0]?.id ?? null);
  useScrollToSection(focused, focusSection);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {HANDBOOK.map((chapter) => {
        const isOpen = open === chapter.id;
        return (
          <div className="card" key={chapter.id} style={{ padding: 0, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : chapter.id)}
              style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, padding: 16, color: "var(--ink)" }}
            >
              <div className="row between">
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{chapter.title}</div>
                  <div className="faint" style={{ fontSize: "0.84rem" }}>{chapter.summary}</div>
                </div>
                <ChevronIcon
                  width={18}
                  height={18}
                  style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)", flex: "none" }}
                />
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }} className="fade-in">
                {chapter.sections.map((s) => (
                  <div key={s.heading} id={`hb-${chapter.id}-${sectionSlug(s.heading)}`} style={{ marginTop: 12 }}>
                    <h3 style={{ fontSize: "0.98rem" }}>{s.heading}</h3>
                    {s.body.map((p, i) => (
                      <p key={i} className="muted" style={{ fontSize: "0.94rem" }}>{p}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
