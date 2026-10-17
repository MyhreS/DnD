import {
  BLOODVIAL_PURITIES,
  BLOODVIAL_PURITY_BY_ID,
  bloodvialEffectLabel,
  bloodvialFailureLabel,
} from "@/data/bloodvial";
import type { BloodvialPurity } from "@/types";

/** The Bloodvial's purity on its existing inventory row, core-rulebook.txt
 * [page 123]. Purity is a field on the one `blood-vial` id, so this renders
 * inside the row that is already there — a selector plus the healing, Madness
 * and Grit figures. The Grit check itself is rolled at the table: this
 * displays the DC and the consequences and never rolls anything. */
export function AppBloodvialPurity({
  purity,
  readOnly,
  onChange,
}: {
  purity: BloodvialPurity;
  readOnly: boolean;
  onChange: (purity: BloodvialPurity) => void;
}) {
  const facts = BLOODVIAL_PURITY_BY_ID[purity];
  return (
    <>
      <span className="appsheet-item-assignments" data-testid="appsheet-bloodvial-purity">
        <label>Purity
          <select
            aria-label="Bloodvial purity"
            disabled={readOnly}
            value={purity}
            onChange={(event) => onChange(event.target.value as BloodvialPurity)}
          >
            {BLOODVIAL_PURITIES.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
      </span>
      <small>{bloodvialEffectLabel(facts)}</small>
      {facts.choices.map((choice, index) => <small key={index}>{index + 1} — {choice}</small>)}
      <small>{bloodvialFailureLabel(facts)}</small>
      <small>{facts.note}</small>
    </>
  );
}
