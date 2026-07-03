import type { HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { BACKGROUNDS } from "@/data/backgrounds";
import { weaponProficiencyInfo } from "@/data/weapons";

/** Equipment training & proficiencies + coins (wireframe bottom-right):
 * armor training as Light/Medium/Heavy checks, weapons as Simple/Martial
 * checks (the Stalker's partial-Martial spelled out), tools, and the GP purse. */
export function TrainingCoinsPanel({ card }: { card: HunterCard }) {
  const klass = getClass(card.classId);
  const bg = card.backgroundId ? BACKGROUNDS.find((b) => b.id === card.backgroundId) : null;
  const prof = klass ? weaponProficiencyInfo(klass) : null;
  const tools = [klass?.toolProficiencies, bg?.tool]
    .filter((t): t is string => !!t && t !== "—")
    .join(", ");

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Training &amp; proficiencies</p>
      <CheckRow
        label="Armor"
        checks={[
          { text: "Light", on: !!klass?.armorTraining.includes("Light armor") },
          { text: "Medium", on: !!klass?.armorTraining.includes("Medium armor") },
          { text: "Heavy", on: !!klass?.armorTraining.includes("Heavy armor") },
        ]}
      />
      <CheckRow
        label="Weapons"
        checks={[
          { text: "Simple", on: !!prof?.simple },
          {
            text: prof?.martialFinesseLight && !prof.martialAll ? "Martial (Finesse/Light)" : "Martial",
            on: !!prof && (prof.martialAll || prof.martialFinesseLight),
          },
        ]}
      />
      <div className="row between" style={{ padding: "6px 0", gap: 12, alignItems: "flex-start" }}>
        <span className="faint" style={{ fontSize: "0.82rem", flex: "none" }}>Tools</span>
        <span style={{ textAlign: "right", fontSize: "0.9rem" }}>{tools || "—"}</span>
      </div>
      <hr className="divider" />
      <div className="row between" style={{ gap: 12 }}>
        <span className="faint" style={{ fontSize: "0.82rem" }}>Coins</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
          {card.coins ?? 0} GP
        </span>
      </div>
    </div>
  );
}

function CheckRow({ label, checks }: { label: string; checks: { text: string; on: boolean }[] }) {
  return (
    <div className="row between" style={{ padding: "6px 0", gap: 12, alignItems: "flex-start" }}>
      <span className="faint" style={{ fontSize: "0.82rem", flex: "none" }}>{label}</span>
      <span style={{ textAlign: "right", fontSize: "0.9rem" }}>
        {checks.map((c) => (
          <span key={c.text} className={c.on ? "" : "faint"} style={{ marginLeft: 10, whiteSpace: "nowrap" }}>
            {c.on ? "☑" : "☐"} {c.text}
          </span>
        ))}
      </span>
    </div>
  );
}
