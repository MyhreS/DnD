import type { HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { classArt } from "@/data/classArt";
import { CreatureSprite } from "@/data/CreatureSprite";
import { classCreatureId } from "@/data/creatures";
import { ClassArt } from "./ClassArt";
import { cardClassName, characterVitals } from "../lib/papersheet";

/**
 * A full-width hunter card for lists (main menu "Your hunters", the in-campaign
 * "Bring a hunter in" picker, the DM "Play as" list): class-art banner, name,
 * class + level, AC, and where it currently plays. The whole card is one
 * tap target (`onOpen`); optional actions float on top of it —
 * absolutely positioned siblings, never a button inside a button.
 */
export function HunterListCard({
  card,
  campaignName,
  onOpen,
  onEdit,
  onDelete,
}: {
  card: HunterCard;
  /** Name of the campaign the hunter is currently in, if any. */
  campaignName?: string | null;
  onOpen: () => void;
  onEdit?: () => void;
  /** Main-menu Hunters only: opens the deliberate archive confirmation. */
  onDelete?: () => void;
}) {
  const klass = getClass(card.classId);
  const art = classArt(card.classId);
  const className = cardClassName(card) || null;
  const ac = characterVitals(card).ac;

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
          {className ? (
            <div className="hunter-list-card-meta">
              <span>{className}</span>
              <span className="hunter-list-card-level">Level {card.level}</span>
              {campaignName && <span className="hunter-list-card-campaign">in {campaignName}</span>}
            </div>
          ) : (
            <div className="faint" style={{ fontSize: "0.82rem", marginTop: 4 }}>Draft — finish the build</div>
          )}
          {ac != null && (
            <div className="hunter-list-card-armor">
              AC {ac}
            </div>
          )}
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
      {onDelete && (
        <div className="row" style={{ gap: 8, padding: "0 16px 14px", position: "relative", zIndex: 2 }}>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={onOpen}>
            View character
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", color: "var(--red, #b54a4a)" }} onClick={onDelete}>
            Delete character
          </button>
        </div>
      )}
    </div>
  );
}
