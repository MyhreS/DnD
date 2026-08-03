import type { Combatant } from "@/types";

export function WardenDesignation({
  wardens,
  designatedId,
  onChange,
}: {
  wardens: Combatant[];
  designatedId: string | null;
  onChange: (id: string) => void;
}) {
  if (wardens.length === 0) return null;
  return (
    <label className="combat-warden-select">
      <span>Tactical Command</span>
      <select
        className="input"
        aria-label="Designated Warden"
        value={designatedId ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {!designatedId && <option value="" disabled>Choose a Warden</option>}
        {wardens.map((warden) => <option key={warden.id} value={warden.id}>{warden.name}</option>)}
      </select>
      <small>Only this Warden receives the unlimited briefing before their 90-second turn.</small>
    </label>
  );
}
