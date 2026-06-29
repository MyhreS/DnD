import { getClass } from "@/data/classes";
import { maxHp, maxSanity } from "@/lib/character";
import { InventoryPanel } from "@/features/hunter/components/InventoryPanel";
import { useCharactersStore } from "../store/charactersStore";
import type { HunterCard } from "@/types";

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));

/** DM full edit of one hunter — vitals, level, and items — written via dmPatch
 * (patchCharacter, partial merge) so the DM never clobbers their own card. */
export function DMCharacterEditor({ card }: { card: HunterCard }) {
  const dmPatch = useCharactersStore((s) => s.dmPatch);
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  const sanMax = klass ? maxSanity(klass, card.abilities, card.level) : 0;
  const hp = Math.min(hpMax, card.currentHp ?? hpMax);
  const san = Math.min(sanMax, card.sanity ?? sanMax);
  const transform = card.transformationLevel ?? 0;

  return (
    <div style={{ marginTop: 8 }}>
      <Stepper
        label="Hit Points"
        value={hp}
        sub={`/ ${hpMax}`}
        onChange={(v) => dmPatch(card.id, { currentHp: clamp(0, hpMax, v) })}
      />
      <Stepper
        label="Sanity"
        value={san}
        sub={`/ ${sanMax} · Madness ${Math.max(0, sanMax - san)}`}
        onChange={(v) => dmPatch(card.id, { sanity: clamp(0, sanMax, v) })}
      />
      <Stepper
        label="Transformation"
        value={transform}
        onChange={(v) => dmPatch(card.id, { transformationLevel: Math.max(0, v) })}
      />
      <Stepper
        label="Level"
        value={card.level}
        onChange={(v) => dmPatch(card.id, { level: clamp(1, 20, v) })}
      />
      <div style={{ marginTop: 8 }}>
        <InventoryPanel card={card} editable onPatch={(p) => dmPatch(card.id, p)} />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  sub,
  onChange,
}: {
  label: string;
  value: number;
  sub?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="row between" style={{ padding: "6px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</span>
        {sub && <span className="faint" style={{ fontSize: "0.74rem" }}> {sub}</span>}
      </div>
      <div className="row" style={{ gap: 8, flex: "none" }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: 32, padding: 4 }}
          aria-label={`decrease ${label}`}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span style={{ fontFamily: "var(--font-display)", minWidth: 36, textAlign: "center" }}>{value}</span>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: 32, padding: 4 }}
          aria-label={`increase ${label}`}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
