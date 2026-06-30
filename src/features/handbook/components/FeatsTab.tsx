import { useState } from "react";
import { FEATS } from "@/data/feats";
import { ChevronIcon } from "@/components/icons";
import type { Feat, FeatCategory } from "@/types";

const CATEGORIES: FeatCategory[] = ["Origin", "General", "Fighting Style", "Epic Boon"];

export function FeatsTab() {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <p className="muted" style={{ fontSize: "0.94rem", marginTop: 0 }}>
        Feats grant special benefits. Your background grants an <strong>Origin</strong> feat at
        level 1; the other categories are gained as you advance.
      </p>
      {CATEGORIES.map((cat) => (
        <FeatCategorySection
          key={cat}
          category={cat}
          feats={FEATS.filter((f) => f.category === cat)}
          defaultOpen={cat === "Origin"}
        />
      ))}
    </div>
  );
}

function FeatCategorySection({
  category,
  feats,
  defaultOpen,
}: {
  category: FeatCategory;
  feats: Feat[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="row between"
        style={{ width: "100%", background: "transparent", border: 0, color: "var(--ink)", padding: "2px 0", cursor: "pointer" }}
      >
        <span className="eyebrow" style={{ margin: 0 }}>
          {category} feats ({feats.length})
        </span>
        <ChevronIcon
          width={16}
          height={16}
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)" }}
        />
      </button>
      {open && (
        <div className="stack fade-in" style={{ gap: 8, marginTop: 10 }}>
          {feats.map((f) => (
            <div className="card" key={f.id}>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              {f.prerequisite && (
                <div className="faint" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                  Prerequisite: {f.prerequisite}
                </div>
              )}
              <p className="muted" style={{ fontSize: "0.9rem", marginTop: 6, marginBottom: 0 }}>{f.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
