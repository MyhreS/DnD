import { SLOT_LOCATION_LABEL, type SlotComputation } from "@/lib/slots";
import { AppPanel } from "./appSheetShared";

export function CarryingCustomization({
  classId,
  slots,
  showWardenReference = false,
}: {
  classId: string | undefined;
  slots: SlotComputation;
  showWardenReference?: boolean;
}) {
  const unassigned = slots.unstowed.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="appsheet-carrying-customization">
      {showWardenReference && classId === "warden" && (
        <figure className="appsheet-carrying-figure" data-testid="warden-carrying-figure">
          <img src="/art/carrying/hunter-warden-carrying-figure.webp" alt="Hunter Warden carrying reference" />
          <figcaption>Hunter Warden carrying reference</figcaption>
        </figure>
      )}
      <AppPanel title="Slot assignment">
        <div className="appsheet-slot-list">
          {slots.rows.map((row) => (
            <div key={row.key} className={row.used > row.capacity ? "over" : ""}>
              <span><b>{SLOT_LOCATION_LABEL[row.location]} · {row.kind}</b><small>{row.items.join(", ") || row.note || "Available"}</small></span>
              <strong>{row.used}/{row.capacity}</strong>
            </div>
          ))}
        </div>
        {slots.unstowed.length > 0 && <p className="appsheet-inline-error">Unassigned: {slots.unstowed.map((entry) => `${entry.name} ×${entry.count}${entry.clamped ? "+" : ""}`).join(", ")}</p>}
        {!unassigned && <p className="appsheet-carrying-complete">All carried items have a slot.</p>}
      </AppPanel>
    </div>
  );
}
