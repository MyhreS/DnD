import { useState } from "react";
import { CLASSES } from "@/data/classes";
import { ABILITY_NAME } from "@/data/abilities";
import { ChevronIcon } from "@/components/icons";
import type { HunterClass, LevelFeature, Subclass } from "@/types";

export function ClassesTab() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {CLASSES.map((c) => (
        <ClassCard key={c.id} c={c} isOpen={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />
      ))}
    </div>
  );
}

function ClassCard({ c, isOpen, onToggle }: { c: HunterClass; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="card">
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, color: "var(--ink)", padding: 0 }}
      >
        <div className="row between">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600 }}>{c.name}</div>
            <div className="gold" style={{ fontSize: "0.86rem" }}>{c.tagline}</div>
          </div>
          <ChevronIcon
            width={18}
            height={18}
            style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)", flex: "none" }}
          />
        </div>
      </button>

      <div className="derived-grid" style={{ marginTop: 12 }}>
        <Mini label="Hit Die" value={`d${c.hitDie}`} />
        <Mini label="Sanity" value={`${c.maxSanity} · d${c.sanityDie}`} />
        <Mini label="Speed" value={`${c.speedFt}ft`} />
        <Mini label="Saves" value={c.savingThrows.map((k) => ABILITY_NAME[k].slice(0, 3)).join("·")} />
      </div>

      {isOpen && (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <p className="muted" style={{ fontSize: "0.94rem" }}>{c.blurb}</p>
          {c.signature && (
            <div className="banner banner-warn" style={{ marginBottom: 12 }}>
              <strong className="gold">Signature.</strong> {c.signature}
            </div>
          )}
          {c.baseClass && <Field label="Built on" value={`${c.baseClass} (5e)`} />}
          <Field label="Primary ability" value={c.primaryAbility} />
          <Field label="Saving throws" value={c.savingThrows.map((k) => ABILITY_NAME[k]).join(", ")} />
          <Field label="Skills" value={`Choose ${c.skillChoices.count}: ${c.skillChoices.options.join(", ")}`} />
          <Field label="Weapons" value={c.weaponProficiencies} />
          <Field label="Tools" value={c.toolProficiencies} />
          <Field label="Armor training" value={c.armorTraining.join(", ")} />

          <hr className="divider" />
          <p className="eyebrow" style={{ marginBottom: 8 }}>Starting equipment</p>
          <div className="chip-row">
            {c.startingEquipment.map((i) => (
              <span className="chip" key={i}>{i}</span>
            ))}
          </div>

          <Collapsible title="Level progression" defaultOpen={false}>
            <LevelTable c={c} />
          </Collapsible>

          <Collapsible title="Class features" defaultOpen={false}>
            <FeatureList features={c.features ?? []} />
          </Collapsible>

          <Collapsible title={`Subclasses (${c.subclasses.length})`} defaultOpen={false}>
            <div className="stack" style={{ gap: 10 }}>
              {c.subclasses.map((s) => (
                <SubclassBlock key={s.id} s={s} />
              ))}
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  );
}

function LevelTable({ c }: { c: HunterClass }) {
  return (
    <div className="table-scroll">
      <table className="level-table">
        <thead>
          <tr>
            <th className="lvl-col">Lv</th>
            <th className="lvl-col">Prof</th>
            <th>Features</th>
            {c.progressionColumns.map((col) => (
              <th key={col} className="lvl-col">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {c.progression.map((row) => (
            <tr key={row.level}>
              <td className="lvl-col">{row.level}</td>
              <td className="lvl-col">+{row.profBonus}</td>
              <td>{row.features || "—"}</td>
              {c.progressionColumns.map((col) => (
                <td key={col} className="lvl-col">{row.extras[col] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureList({ features }: { features: LevelFeature[] }) {
  return (
    <ul className="list-reset pill-list">
      {features.map((f, i) => (
        <li key={i}>
          <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
            <span className="role-tag" style={{ flex: "none" }}>Lv {f.level}</span>
            <span style={{ fontWeight: 600 }}>{f.name}</span>
          </div>
          <div className="muted" style={{ fontSize: "0.88rem", marginTop: 2, whiteSpace: "pre-wrap" }}>{f.text}</div>
        </li>
      ))}
    </ul>
  );
}

function SubclassBlock({ s }: { s: Subclass }) {
  return (
    <div className="card" style={{ background: "var(--bg-elev-2)" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1rem" }}>{s.name}</div>
      <div className="gold" style={{ fontSize: "0.82rem" }}>{s.tagline}</div>
      <p className="muted" style={{ fontSize: "0.9rem", marginTop: 6 }}>{s.blurb}</p>
      <FeatureList features={s.features} />
    </div>
  );
}

function Collapsible({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <hr className="divider" />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="row between"
        style={{ width: "100%", background: "transparent", border: 0, color: "var(--ink)", padding: "2px 0", cursor: "pointer" }}
      >
        <span className="eyebrow" style={{ margin: 0 }}>{title}</span>
        <ChevronIcon
          width={16}
          height={16}
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)" }}
        />
      </button>
      {open && <div className="fade-in" style={{ marginTop: 10 }}>{children}</div>}
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat" style={{ padding: "8px 4px" }}>
      <div className="stat-label">{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "0.92rem", marginTop: 2 }}>{value}</div>
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
