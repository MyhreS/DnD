import { useState } from "react";
import { HANDBOOK } from "@/data/handbook";
import { CLASSES } from "@/data/classes";
import { ARMOR } from "@/data/armor";
import { ABILITY_NAME } from "@/data/abilities";
import { ChevronIcon } from "@/components/icons";
import type { ArmorCategory } from "@/types";
import { AsyncButton } from "@/components/AsyncButton";
import { downloadHandbookPdf } from "../lib/handbookPdf";

type Tab = "rules" | "classes" | "armory";

export function HandbookPage() {
  const [tab, setTab] = useState<Tab>("rules");

  return (
    <div>
      <p className="eyebrow">The Codex</p>
      <h1 className="page-title">Player's Handbook</h1>
      <p className="page-intro">Everything you need to play Catacombs &amp; Starspawns.</p>

      <div className="row" style={{ gap: 8, marginBottom: 18 }}>
        <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>
          Rules
        </TabButton>
        <TabButton active={tab === "classes"} onClick={() => setTab("classes")}>
          Classes
        </TabButton>
        <TabButton active={tab === "armory"} onClick={() => setTab("armory")}>
          Armory
        </TabButton>
      </div>

      {tab === "rules" && <RulesTab />}
      {tab === "classes" && <ClassesTab />}
      {tab === "armory" && <ArmoryTab />}

      <div className="rule-ornament">◆</div>
      <AsyncButton
        className="btn btn-ghost"
        pendingText="Preparing…"
        showDone={false}
        onClick={downloadHandbookPdf}
      >
        Download the full handbook (PDF)
      </AsyncButton>
      <p className="faint center" style={{ fontSize: "0.76rem", marginTop: 8 }}>
        Saves the PDF so you can read it in Files / your PDF app.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip selectable${active ? " selected" : ""}`}
      style={{ flex: 1, justifyContent: "center", padding: "9px 8px" }}
    >
      {children}
    </button>
  );
}

function RulesTab() {
  const [open, setOpen] = useState<string | null>(HANDBOOK[0]?.id ?? null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {HANDBOOK.map((chapter) => {
        const isOpen = open === chapter.id;
        return (
          <div className="card" key={chapter.id} style={{ padding: 0, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : chapter.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: 0,
                padding: 16,
                color: "var(--ink)",
              }}
            >
              <div className="row between">
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {chapter.title}
                  </div>
                  <div className="faint" style={{ fontSize: "0.84rem" }}>
                    {chapter.summary}
                  </div>
                </div>
                <ChevronIcon
                  width={18}
                  height={18}
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s ease",
                    color: "var(--gold-dim)",
                    flex: "none",
                  }}
                />
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }} className="fade-in">
                {chapter.sections.map((s) => (
                  <div key={s.heading} style={{ marginTop: 12 }}>
                    <h3 style={{ fontSize: "0.98rem" }}>{s.heading}</h3>
                    {s.body.map((p, i) => (
                      <p key={i} className="muted" style={{ fontSize: "0.94rem" }}>
                        {p}
                      </p>
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

function ClassesTab() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {CLASSES.map((c) => {
        const isOpen = open === c.id;
        return (
          <div className="card" key={c.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : c.id)}
              style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, color: "var(--ink)", padding: 0 }}
            >
              <div className="row between">
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600 }}>
                    {c.name}
                  </div>
                  <div className="gold" style={{ fontSize: "0.86rem" }}>{c.tagline}</div>
                </div>
                <ChevronIcon
                  width={18}
                  height={18}
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s ease",
                    color: "var(--gold-dim)",
                    flex: "none",
                  }}
                />
              </div>
            </button>

            <div className="derived-grid" style={{ marginTop: 12 }}>
              <Mini label="Hit Die" value={`d${c.hitDie}`} />
              <Mini label="Speed" value={`${c.speedFt}ft`} />
              <Mini label="Primary" value={c.primaryAbility} />
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
                {c.features && c.features.length > 0 && (
                  <>
                    <hr className="divider" />
                    <p className="eyebrow" style={{ marginBottom: 8 }}>Level progression</p>
                    <ul className="list-reset pill-list">
                      {c.features.map((f, i) => (
                        <li key={i}>
                          <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                            <span className="role-tag" style={{ flex: "none" }}>Lv {f.level}</span>
                            <span style={{ fontWeight: 600 }}>{f.name}</span>
                          </div>
                          <div className="muted" style={{ fontSize: "0.88rem", marginTop: 2 }}>{f.text}</div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const ARMOR_GROUPS: ArmorCategory[] = ["Main Armor", "Add-on Armor", "Extra"];

function ArmoryTab() {
  return (
    <div className="stack" style={{ gap: 14 }}>
      {ARMOR_GROUPS.map((group) => (
        <div key={group}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>{group}</p>
          <div className="card">
            <ul className="list-reset pill-list">
              {ARMOR.filter((a) => a.category === group).map((a) => (
                <li key={a.id}>
                  <div className="row between">
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    <span className="gold" style={{ flex: "none" }}>{a.ac}</span>
                  </div>
                  <div className="faint" style={{ fontSize: "0.84rem", marginTop: 2 }}>
                    {a.weightLb} lb · {a.special}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
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
