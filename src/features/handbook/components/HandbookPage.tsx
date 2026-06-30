import { useState } from "react";
import { HANDBOOK } from "@/data/handbook";
import { ARMOR } from "@/data/armor";
import { ChevronIcon } from "@/components/icons";
import type { ArmorCategory } from "@/types";
import { AsyncButton } from "@/components/AsyncButton";
import { downloadHandbookPdf } from "../lib/handbookPdf";
import { ClassesTab } from "./ClassesTab";
import { RitesTab } from "./RitesTab";
import { BackgroundsTab } from "./BackgroundsTab";
import { FeatsTab } from "./FeatsTab";

type Tab = "rules" | "classes" | "backgrounds" | "feats" | "rites" | "armory";

export function HandbookPage() {
  const [tab, setTab] = useState<Tab>("rules");

  return (
    <div className="reading">
      <p className="eyebrow">The Codex</p>
      <h1 className="page-title">Player's Handbook</h1>
      <p className="page-intro">Everything you need to play Catacombs &amp; Starspawns.</p>

      <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>Rules</TabButton>
        <TabButton active={tab === "classes"} onClick={() => setTab("classes")}>Classes</TabButton>
        <TabButton active={tab === "backgrounds"} onClick={() => setTab("backgrounds")}>Backgrounds</TabButton>
        <TabButton active={tab === "feats"} onClick={() => setTab("feats")}>Feats</TabButton>
        <TabButton active={tab === "rites"} onClick={() => setTab("rites")}>Rites</TabButton>
        <TabButton active={tab === "armory"} onClick={() => setTab("armory")}>Armory</TabButton>
      </div>

      {tab === "rules" && <RulesTab />}
      {tab === "classes" && <ClassesTab />}
      {tab === "backgrounds" && <BackgroundsTab />}
      {tab === "feats" && <FeatsTab />}
      {tab === "rites" && <RitesTab />}
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
                  <div key={s.heading} style={{ marginTop: 12 }}>
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

const ARMOR_GROUPS: ArmorCategory[] = ["Main Armor", "Add-on Armor", "Armor Upgrade", "Extra"];

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
