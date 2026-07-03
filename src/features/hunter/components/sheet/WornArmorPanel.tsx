import type { ArmorPiece, ExtraSubcategory, HunterCard } from "@/types";
import { ARMOR_BY_ID } from "@/data/armor";
import { studdedAddonIdsOf } from "@/lib/character";
import { takeOffArmor, toggleStud } from "../../lib/equipment";

/** The worn-armor body panel (wireframe middle-left): head gear / scarf /
 * main armor / gloves / boots slot boxes, the Add-on rows with per-piece
 * STUDS checkboxes + take-off actions, and the worn pieces' Special texts.
 * Read-only (no actions) when `onPatch` is undefined — the party gallery. */
export function WornArmorPanel({
  card,
  onPatch,
  onError,
}: {
  card: HunterCard;
  onPatch?: (p: Partial<HunterCard>) => void;
  onError?: (msg: string) => void;
}) {
  const extras = (card.extraArmorIds ?? []).map((id) => ARMOR_BY_ID[id]).filter(Boolean);
  const bySub = (sub: ExtraSubcategory) => extras.find((p) => p.subcategory === sub) ?? null;
  const main = card.mainArmorId ? ARMOR_BY_ID[card.mainArmorId] : null;
  const addons = (card.addonArmorIds ?? []).map((id) => ARMOR_BY_ID[id]).filter(Boolean);
  const studdedIds = studdedAddonIdsOf(card);
  const robe = bySub("Robe");

  function run(result: ReturnType<typeof takeOffArmor>) {
    if ("error" in result) onError?.(result.error);
    else onPatch?.(result.patch);
  }
  const takeOff = onPatch ? (id: string) => run(takeOffArmor(card, id)) : undefined;

  const specials = [
    ...(main ? [main] : []),
    ...addons,
    ...extras,
  ].filter((p) => p.special);

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Worn armor</p>
      <div className="body-grid">
        <SlotBox label="Head Gear" piece={bySub("Head Gear")} onTakeOff={takeOff} />
        <SlotBox label="Scarf" piece={bySub("Scarf")} onTakeOff={takeOff} />
        <SlotBox label="Main Armor" piece={main} wide onTakeOff={takeOff} />
        {robe && <SlotBox label="Robe" piece={robe} wide onTakeOff={takeOff} />}
        <SlotBox label="Gloves" piece={bySub("Gloves")} onTakeOff={takeOff} />
        <SlotBox label="Boots" piece={bySub("Boots")} onTakeOff={takeOff} />
      </div>

      <p className="eyebrow" style={{ margin: "14px 0 6px" }}>Add-on armor</p>
      {addons.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>None worn.</p>
      ) : (
        addons.map((a) => {
          const studded = studdedIds.includes(a.id);
          return (
            <div key={a.id} className="row between" style={{ padding: "6px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{a.name}</span>{" "}
                <span className="faint" style={{ fontSize: "0.76rem" }}>{a.ac}{studded ? " · studded +3 lb" : ""}</span>
              </div>
              <div className="row" style={{ gap: 6, flex: "none", alignItems: "center" }}>
                {onPatch ? (
                  <button
                    type="button"
                    className={`chip selectable${studded ? " selected" : ""}`}
                    aria-pressed={studded}
                    onClick={() => run(toggleStud(card, a.id))}
                  >
                    {studded ? "☑" : "☐"} Studs
                  </button>
                ) : (
                  studded && <span className="chip">☑ Studs</span>
                )}
                {takeOff && (
                  <button type="button" className="btn btn-ghost btn-sm no-print" style={{ width: "auto", padding: "4px 8px" }} onClick={() => takeOff(a.id)}>
                    Take off
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
      {studdedIds.length > 0 && (
        <p className="faint" style={{ fontSize: "0.76rem", margin: "6px 0 0" }}>
          Studded (+{studdedIds.length >= 5 ? 2 : 1} AC): disadvantage on Dexterity (Stealth) checks to hide or move silently.
        </p>
      )}

      {specials.length > 0 && (
        <>
          <p className="eyebrow" style={{ margin: "14px 0 6px" }}>Special</p>
          {specials.map((p) => (
            <p key={p.id} className="muted" style={{ fontSize: "0.82rem", margin: "0 0 6px" }}>
              <span className="gold">{p.name}.</span> {p.special}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

function SlotBox({
  label,
  piece,
  wide,
  onTakeOff,
}: {
  label: string;
  piece: ArmorPiece | null;
  wide?: boolean;
  onTakeOff?: (id: string) => void;
}) {
  return (
    <div className={`slot-box${wide ? " slot-box-wide" : ""}${piece ? "" : " slot-box-empty"}`}>
      <div className="stat-label">{label}</div>
      {piece ? (
        <>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginTop: 2 }}>{piece.name}</div>
          <div className="faint" style={{ fontSize: "0.74rem" }}>
            {piece.category === "Main Armor" ? piece.ac : `${piece.weightLb} lb`}
          </div>
          {onTakeOff && (
            <button
              type="button"
              className="btn btn-ghost btn-sm no-print"
              style={{ width: "auto", padding: "2px 8px", marginTop: 4, fontSize: "0.72rem" }}
              onClick={() => onTakeOff(piece.id)}
            >
              Take off
            </button>
          )}
        </>
      ) : (
        <div className="faint" style={{ fontSize: "0.8rem", marginTop: 2 }}>—</div>
      )}
    </div>
  );
}
