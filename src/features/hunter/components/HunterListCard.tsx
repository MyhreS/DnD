import type { HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { maxHp, armorClassFor } from "@/lib/character";
import { classArt } from "@/data/classArt";
import { CreatureSprite } from "@/data/CreatureSprite";
import { classCreatureId } from "@/data/creatures";
import { ClassArt } from "./ClassArt";

/**
 * A full-width hunter card for lists (main menu "Your hunters", the in-campaign
 * "Bring a hunter in" picker, the DM "Play as" list): class-art banner, name,
 * class + level, HP/AC, and where it currently plays. The whole card is one
 * tap target (`onOpen`); an optional small Edit button floats on top of it —
 * absolutely positioned siblings, never a button inside a button.
 */
export function HunterListCard({
  card,
  campaignName,
  actionHint = "View →",
  onOpen,
  onEdit,
}: {
  card: HunterCard;
  /** Name of the campaign the hunter is currently in, if any. */
  campaignName?: string | null;
  /** The gold call-to-action line, e.g. "Bring in →". */
  actionHint?: string;
  onOpen: () => void;
  onEdit?: () => void;
}) {
  const klass = getClass(card.classId);
  const art = classArt(card.classId);
  const classLine = klass
    ? `${klass.name} · Level ${card.level}${campaignName ? ` · in ${campaignName}` : ""}`
    : "Draft — finish the build";

  return (
    <div className="card card-hover" style={{ position: "relative", padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        aria-label={`Open ${card.name || "unnamed hunter"}`}
        onClick={onOpen}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "transparent",
          border: 0,
          borderRadius: "inherit",
          cursor: "pointer",
        }}
      />
      <ClassArt classId={card.classId} alt="" height={120} />
      {onEdit && art && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onEdit}
          style={{ position: "absolute", top: 10, left: 10, width: "auto", zIndex: 2 }}
        >
          Edit
        </button>
      )}
      <div className="row between" style={{ gap: 12, padding: "14px 16px", alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
            {card.name || "Unnamed hunter"}
          </div>
          <div className="faint" style={{ fontSize: "0.82rem", marginTop: 2 }}>{classLine}</div>
          {klass && (
            <div className="faint" style={{ fontSize: "0.82rem", marginTop: 2 }}>
              HP {maxHp(klass, card.abilities, card.level)} · AC {armorClassFor(card).total}
            </div>
          )}
          <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>{actionHint}</div>
        </div>
        <div className="row" style={{ gap: 10, flex: "none", alignItems: "center" }}>
          {klass && !art && <CreatureSprite id={classCreatureId(card.classId)} size={40} />}
          {onEdit && !art && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onEdit}
              style={{ position: "relative", width: "auto", zIndex: 2 }}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
