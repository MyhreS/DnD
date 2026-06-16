import type { HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { ARMOR_BY_ID } from "@/data/armor";
import { ABILITIES, ABILITY_NAME, abilityModifier, formatModifier } from "@/data/abilities";
import { armorClass, maxHp } from "@/lib/character";
import { CreatureSprite } from "@/data/CreatureSprite";
import { creatureName } from "@/data/creatures";

export function HunterCardView({ card }: { card: HunterCard }) {
  const klass = getClass(card.classId);
  const ac = armorClass(card.abilities, card.mainArmorId);
  const hp = klass ? maxHp(klass, card.abilities) : null;
  const armor = card.mainArmorId ? ARMOR_BY_ID[card.mainArmorId] : null;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card row between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{klass ? klass.title : "Hunter"}</p>
          <h1 style={{ marginBottom: 2 }}>{card.name || "Unnamed Hunter"}</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {[card.background, klass ? `${klass.name} · Level ${card.level}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {card.creatureId && (
          <div className="center" style={{ flex: "none" }} title={`Mascot: ${creatureName(card.creatureId)}`}>
            <CreatureSprite id={card.creatureId} size={46} />
            <div className="faint" style={{ fontSize: "0.62rem", letterSpacing: "0.06em" }}>
              {creatureName(card.creatureId)}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="derived-grid">
          <Stat label="Armor Class" value={ac.total} />
          <Stat label="Max HP" value={hp ?? "—"} />
          <Stat label="Speed" value={klass ? `${klass.speedFt}ft` : "—"} />
          <Stat label="Prof." value="+2" />
          <Stat label="Madness" value={card.madness ?? 0} />
          <Stat label="Transform" value={card.transform ?? 0} />
        </div>
        <p className="faint" style={{ fontSize: "0.74rem", marginTop: 10, marginBottom: 0 }}>
          Madness &amp; Transform are tracked in play alongside HP. Full rules land
          with the updated handbook.
        </p>
      </div>

      {klass?.signature && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 6 }}>Signature</p>
          <p className="muted" style={{ marginBottom: 0, fontSize: "0.94rem" }}>{klass.signature}</p>
        </div>
      )}

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Abilities</p>
        <div className="stat-grid">
          {ABILITIES.map(({ key, short }) => {
            const score = card.abilities[key];
            return (
              <div className="stat" key={key}>
                <div className="stat-label">{short}</div>
                <div className="stat-value">{formatModifier(abilityModifier(score))}</div>
                <div className="stat-sub">{score}</div>
              </div>
            );
          })}
        </div>
      </div>

      {klass && (
        <div className="card">
          <p className="eyebrow">Proficiencies</p>
          <Detail
            label="Saving throws"
            value={klass.savingThrows.map((k) => ABILITY_NAME[k]).join(", ")}
          />
          <Detail
            label="Skills"
            value={card.skillProficiencies.length ? card.skillProficiencies.join(", ") : "—"}
          />
          <Detail label="Weapons" value={klass.weaponProficiencies} />
          <Detail label="Tools" value={klass.toolProficiencies} />
          <Detail label="Armor training" value={klass.armorTraining.join(", ")} />
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Armor & gear</p>
        <Detail label="Worn" value={armor ? `${armor.name} (${armor.ac})` : "Unarmored"} />
        {armor && <p className="muted" style={{ fontSize: "0.88rem", marginTop: 6 }}>{armor.special}</p>}
        {klass && (
          <>
            <hr className="divider" />
            <p className="eyebrow" style={{ marginBottom: 8 }}>Starting equipment</p>
            <div className="chip-row">
              {klass.startingEquipment.map((item) => (
                <span className="chip" key={item}>{item}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {card.notes && (
        <div className="card">
          <p className="eyebrow">Notes</p>
          <p className="muted" style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
            {card.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between" style={{ padding: "6px 0", gap: 12, alignItems: "flex-start" }}>
      <span className="faint" style={{ fontSize: "0.82rem", flex: "none" }}>{label}</span>
      <span style={{ textAlign: "right", fontSize: "0.92rem" }}>{value}</span>
    </div>
  );
}
