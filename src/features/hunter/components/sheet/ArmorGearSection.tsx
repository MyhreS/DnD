import { useState } from "react";
import type { HunterCard } from "@/types";
import { AcWeightSummary } from "./AcWeightSummary";
import { WornArmorPanel } from "./WornArmorPanel";
import { StorageSlotsPanel } from "./StorageSlotsPanel";
import { TrainingCoinsPanel } from "./TrainingCoinsPanel";

/** The sheet's armor & gear area (issue #139's wireframe): the AC/weight/
 * impressions summary strip, then the worn-armor body panel beside the
 * storage-slots and training/coins panels. Fully read-only without `onPatch`
 * (the party gallery); all writes are single merge patches. */
export function ArmorGearSection({
  card,
  onPatch,
}: {
  card: HunterCard;
  onPatch?: (p: Partial<HunterCard>) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const patch = onPatch
    ? (p: Partial<HunterCard>) => {
        setError(null);
        onPatch(p);
      }
    : undefined;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <AcWeightSummary card={card} />
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", padding: "2px 8px", marginLeft: 8 }} onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="sheet-cols">
        <WornArmorPanel card={card} onPatch={patch} onError={setError} />
        <div className="stack" style={{ gap: 14 }}>
          <StorageSlotsPanel card={card} onPatch={patch} onError={setError} />
          <TrainingCoinsPanel card={card} />
        </div>
      </div>
    </div>
  );
}
