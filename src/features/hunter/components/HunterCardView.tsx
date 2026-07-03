import type { HunterCard } from "@/types";
import { getClass, getSubclass } from "@/data/classes";
import { SKILLS_BY_ABILITY } from "@/data/skills";
import { ABILITIES, abilityModifier, formatModifier } from "@/data/abilities";
import {
  armorClassFor,
  maxHp,
  maxSanity,
  proficiencyBonus,
  saveModifier,
  skillModifier,
  initiativeMod,
  earnedLevel,
  insightToNext,
  subclassDisplayName,
} from "@/lib/character";
import { CreatureSprite } from "@/data/CreatureSprite";
import { classCreatureId } from "@/data/creatures";
import { classArt } from "@/data/classArt";
import { ClassArt } from "./ClassArt";
import { RitesSection } from "./RitesSection";
import { FeaturesSection } from "./FeaturesSection";
import { ArmorGearSection } from "./sheet/ArmorGearSection";
import { WeaponTable } from "./sheet/WeaponTable";

export function HunterCardView({
  card,
  onPatch,
}: {
  card: HunterCard;
  /** When provided, in-sheet management (e.g. preparing Whispers) is enabled
   * and writes route here (owner save or DM patch). */
  onPatch?: (p: Partial<HunterCard>) => void;
}) {
  const klass = getClass(card.classId);
  const sub = getSubclass(card.classId, card.subclassId);
  const ac = armorClassFor(card);
  const lvl = card.level;
  const prof = proficiencyBonus(lvl);
  const hp = klass ? maxHp(klass, card.abilities, lvl) : null;
  const san = klass ? maxSanity(klass, card.abilities, lvl) : null;
  const insight = card.insight ?? 0;
  const earned = earnedLevel(card);
  const nextLevel = insightToNext(card);
  const insightSub = earned > lvl
    ? `Lv ${earned} after a rest`
    : nextLevel
      ? `${nextLevel.remaining} to Lv ${nextLevel.nextLevel}`
      : "max level";
  const transformation = card.transformationLevel ?? 0;
  const art = classArt(card.classId);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <ClassArt classId={card.classId} alt={klass ? klass.name : "Hunter"} />
        <div className="row between" style={{ gap: 12, padding: 18 }}>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">{klass ? klass.title : "Hunter"}</p>
            <h1 style={{ marginBottom: 2 }}>{card.name || "Unnamed Hunter"}</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              {[card.background, klass ? `${klass.name} · Level ${lvl}` : null, subclassDisplayName(sub?.name, card.subclassId)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {card.feat && (
              <p className="faint" style={{ marginBottom: 0, marginTop: 2, fontSize: "0.8rem" }}>
                Origin feat: {card.feat}
              </p>
            )}
          </div>
          {klass && !art && (
            <div className="center" style={{ flex: "none" }} title={klass.title}>
              <CreatureSprite id={classCreatureId(card.classId)} size={46} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="derived-grid">
          <Stat label="Armor Class" value={ac.total} />
          <Stat label="Max HP" value={hp ?? "—"} />
          <Stat label="Initiative" value={formatModifier(initiativeMod(card.abilities))} />
          <Stat label="Speed" value={klass ? `${klass.speedFt}ft` : "—"} />
          <Stat label="Prof." value={formatModifier(prof)} />
          <Stat label="Sanity" value={san ?? "—"} sub={klass ? klass.sanityDie : undefined} />
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

      <FeaturesSection card={card} />

      {klass?.caster && <RitesSection card={card} lvl={lvl} onPatch={onPatch} />}

      <ArmorGearSection card={card} onPatch={onPatch} />

      <WeaponTable card={card} />
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
