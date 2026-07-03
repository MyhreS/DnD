import type { HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { WEAPON_STATS, weaponAttackBonus } from "@/data/weapons";
import { formatModifier } from "@/data/abilities";
import { resolveInventory } from "@/lib/inventory";

/** The Weapon Damage table (wireframe page 3): every carried weapon with its
 * attack bonus (ability mod + proficiency per class), damage and notes. The
 * Hunter Cleaver has no stats in any source — its numbers come from the DM. */
export function WeaponTable({ card }: { card: HunterCard }) {
  const klass = getClass(card.classId);
  const weapons = resolveInventory(card).filter((e) => e.item.category === "Weapon");

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Weapon damage</p>
      {weapons.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>No weapons carried.</p>
      ) : (
        <div className="table-scroll">
          <table className="level-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Atk bonus</th>
                <th>Damage</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {weapons.map(({ item, qty }) => {
                const stats = WEAPON_STATS[item.id];
                const atk = stats
                  ? formatModifier(weaponAttackBonus(klass, card.abilities, card.level, stats))
                  : "—";
                const damage = stats ? `${stats.damage} ${stats.damageType}` : "—";
                const notes = stats
                  ? [...stats.properties, `Mastery: ${stats.mastery}`].join(" · ")
                  : "Unique — stats set by the DM.";
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {item.name}
                      {qty > 1 && <span className="faint"> ×{qty}</span>}
                    </td>
                    <td className="lvl-col">{atk}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{damage}</td>
                    <td className="faint" style={{ fontSize: "0.76rem", minWidth: 200 }}>{notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
