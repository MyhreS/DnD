import { ARMOR } from "@/data/armor";
import type { ArmorCategory } from "@/types";

const ARMOR_GROUPS: ArmorCategory[] = ["Main Armor", "Add-on Armor", "Armor Upgrade", "Extra"];

export function ArmoryTab() {
  return (
    <div className="stack" style={{ gap: 14 }}>
      {ARMOR_GROUPS.map((group) => (
        <div key={group}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>{group}</p>
          <div className="card">
            {group === "Extra" && (
              <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                You may wear only one Extra per subcategory.
              </p>
            )}
            <ul className="list-reset pill-list">
              {ARMOR.filter((a) => a.category === group).map((a) => (
                <li key={a.id}>
                  <div className="row between">
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    <span className="gold" style={{ flex: "none" }}>{a.ac}</span>
                  </div>
                  <div className="faint" style={{ fontSize: "0.84rem", marginTop: 2 }}>
                    {a.subcategory ? `${a.subcategory} · ` : ""}{a.weightLb} lb · {a.special}
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
