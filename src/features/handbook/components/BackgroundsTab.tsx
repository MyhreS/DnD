import { useState } from "react";
import { BACKGROUNDS } from "@/data/backgrounds";
import { ABILITY_NAME } from "@/data/abilities";
import { ChevronIcon } from "@/components/icons";
import type { Background } from "@/types";

export function BackgroundsTab() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="muted" style={{ fontSize: "0.94rem", marginTop: 0 }}>
        Your background is the occupation that shaped you before the hunt. Each grants a Feat,
        two skill proficiencies, one tool proficiency, ability points, and starting equipment.
      </p>
      {BACKGROUNDS.map((b) => (
        <BackgroundCard
          key={b.id}
          b={b}
          isOpen={open === b.id}
          onToggle={() => setOpen(open === b.id ? null : b.id)}
        />
      ))}
    </div>
  );
}

function BackgroundCard({ b, isOpen, onToggle }: { b: Background; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="card">
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, color: "var(--ink)", padding: 0 }}
      >
        <div className="row between">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 600 }}>{b.name}</div>
            <div className="gold" style={{ fontSize: "0.84rem" }}>
              {b.feat ? `${b.feat} · ` : ""}
              {b.skills.join(", ")}
            </div>
          </div>
          <ChevronIcon
            width={18}
            height={18}
            style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)", flex: "none" }}
          />
        </div>
      </button>

      {isOpen && (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <p className="muted" style={{ fontSize: "0.94rem" }}>{b.text}</p>
          <Field label="Feat" value={b.feat ?? "Choose any Origin feat"} />
          <Field label="Skills" value={b.skills.join(", ")} />
          <Field label="Tool" value={b.tool ?? "—"} />
          <Field label="Ability scores" value={b.abilityScores.map((a) => ABILITY_NAME[a]).join(", ") || "—"} />
          {b.equipment.length > 0 && <Field label="Equipment" value={b.equipment.join(", ")} />}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span className="faint" style={{ fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ fontSize: "0.94rem" }}>{value}</div>
    </div>
  );
}
