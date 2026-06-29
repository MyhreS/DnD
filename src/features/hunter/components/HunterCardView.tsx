import type { HunterCard } from "@/types";
import { getClass, getSubclass } from "@/data/classes";
import { ARMOR_BY_ID } from "@/data/armor";
import { SKILLS_BY_ABILITY } from "@/data/skills";
import { RITE_BY_ID } from "@/data/rites";
import { ABILITIES, abilityModifier, formatModifier } from "@/data/abilities";
import {
  armorClass,
  maxHp,
  maxSanity,
  proficiencyBonus,
  saveModifier,
  skillModifier,
  riteStats,
  initiativeMod,
  earnedLevel,
  insightToNext,
} from "@/lib/character";
import { CreatureSprite } from "@/data/CreatureSprite";
import { classCreatureId } from "@/data/creatures";

export function HunterCardView({ card }: { card: HunterCard }) {
  const klass = getClass(card.classId);
  const sub = getSubclass(card.classId, card.subclassId);
  const ac = armorClass(card.abilities, card.mainArmorId);
  const lvl = card.level;
  const prof = proficiencyBonus(lvl);
  const hp = klass ? maxHp(klass, card.abilities, lvl) : null;
  const san = klass ? maxSanity(klass, card.abilities, lvl) : null;
  const armor = card.mainArmorId ? ARMOR_BY_ID[card.mainArmorId] : null;
  const insight = card.insight ?? 0;
  const earned = earnedLevel(card);
  const nextLevel = insightToNext(insight);
  const insightSub = earned > lvl
    ? `Lv ${earned} after a rest`
    : nextLevel
      ? `${nextLevel.remaining} to Lv ${nextLevel.nextLevel}`
      : "max level";
  const transformation = card.transformationLevel ?? 0;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card row between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{klass ? klass.title : "Hunter"}</p>
          <h1 style={{ marginBottom: 2 }}>{card.name || "Unnamed Hunter"}</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {[card.background, klass ? `${klass.name} · Level ${lvl}` : null, sub?.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {klass && (
          <div className="center" style={{ flex: "none" }} title={klass.title}>
            <CreatureSprite id={classCreatureId(card.classId)} size={46} />
          </div>
        )}
      </div>

      <div className="card">
        <div className="derived-grid">
          <Stat label="Armor Class" value={ac.total} />
          <Stat label="Max HP" value={hp ?? "—"} />
          <Stat label="Initiative" value={formatModifier(initiativeMod(card.abilities))} />
          <Stat label="Speed" value={klass ? `${klass.speedFt}ft` : "—"} />
          <Stat label="Prof." value={formatModifier(prof)} />
          <Stat label="Sanity" value={san ?? "—"} sub={klass ? `d${klass.sanityDie}` : undefined} />
          <Stat label="Transform" value={transformation} />
          <Stat label="Insight" value={insight} sub={insightSub} />
          <Stat label="Blood Tinge" value={card.bloodTinge ? "●" : "○"} />
        </div>
      </div>

      {klass?.signature && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 6 }}>Signature</p>
          <p className="muted" style={{ marginBottom: 0, fontSize: "0.94rem" }}>{klass.signature}</p>
        </div>
      )}

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Abilities &amp; saves</p>
        <div className="stat-grid">
          {ABILITIES.map(({ key, short }) => {
            const score = card.abilities[key];
            const sv = klass ? saveModifier(klass, card.abilities, key, lvl) : abilityModifier(score);
            const proficient = klass?.savingThrows.includes(key);
            return (
              <div className="stat" key={key}>
                <div className="stat-label">{short}</div>
                <div className="stat-value">{formatModifier(abilityModifier(score))}</div>
                <div className="stat-sub">{score}</div>
                <div className="faint" style={{ fontSize: "0.68rem", marginTop: 2 }}>
                  {proficient ? "●" : "○"} save {formatModifier(sv)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Skills</p>
        <div className="skill-grid">
          {SKILLS_BY_ABILITY.flatMap(({ skills }) =>
            skills.map((s) => {
              const proficient = card.skillProficiencies.includes(s.name);
              const mod = skillModifier(card.abilities, s.name, proficient, lvl);
              return (
                <div
                  key={s.name}
                  className="row between"
                  style={{ gap: 6, opacity: proficient ? 1 : 0.62, fontSize: "0.86rem", padding: "2px 0" }}
                >
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {proficient ? "●" : "○"} {s.name}
                    <span className="faint" style={{ fontSize: "0.7rem" }}> {s.ability.toUpperCase()}</span>
                  </span>
                  <span className={proficient ? "gold" : ""} style={{ flex: "none" }}>{formatModifier(mod)}</span>
                </div>
              );
            }),
          )}
        </div>
      </div>

      {klass && (
        <div className="card">
          <p className="eyebrow">Proficiencies</p>
          <Detail label="Weapons" value={klass.weaponProficiencies} />
          <Detail label="Tools" value={klass.toolProficiencies} />
          <Detail label="Armor training" value={klass.armorTraining.join(", ")} />
        </div>
      )}

      {klass?.caster && <RitesSection card={card} lvl={lvl} />}

      <div className="card">
        <p className="eyebrow">Armor &amp; gear</p>
        <Detail label="Worn" value={armor ? `${armor.name} (${armor.ac})` : "Unarmored"} />
        {armor && <p className="muted" style={{ fontSize: "0.88rem", marginTop: 6 }}>{armor.special}</p>}
        <Detail label="Coins" value={`${card.coins ?? 0} GP`} />
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

function RitesSection({ card, lvl }: { card: HunterCard; lvl: number }) {
  const r = riteStats(card.abilities, lvl);
  const prepared = (card.preparedWhispers ?? []).map((id) => RITE_BY_ID[id]).filter(Boolean);
  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Rites</p>
      <div className="derived-grid">
        <Stat label="Ability" value="INT" />
        <Stat label="Rite Mod." value={formatModifier(r.modifier)} />
        <Stat label="Save DC" value={r.saveDc} />
        <Stat label="Attack" value={formatModifier(r.attack)} />
      </div>
      <hr className="divider" />
      <p className="eyebrow" style={{ marginBottom: 8 }}>Prepared Whispers</p>
      {prepared.length ? (
        <ul className="list-reset pill-list">
          {prepared.map((rite) => (
            <li key={rite.id}>
              <div className="row between">
                <span style={{ fontWeight: 600 }}>{rite.name}</span>
                <span className="gold" style={{ flex: "none", fontSize: "0.78rem" }}>
                  {rite.whisper ? "Whisper" : `Lv ${rite.level}`} · {rite.type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="faint" style={{ fontSize: "0.86rem", margin: 0 }}>
          None prepared. Browse the Book of the Deepcaller in the Handbook → Rites.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
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
