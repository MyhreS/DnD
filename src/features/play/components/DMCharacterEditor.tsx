import { getClass } from "@/data/classes";
import { maxHp, maxSanity, INSIGHT_THRESHOLDS, isSheetCard } from "@/lib/character";
import { InventorySection } from "@/features/hunter/components/sheet/InventorySection";
import { TransformationEditor } from "@/features/hunter/components/TransformationPanel";
import { useCharactersStore } from "../store/charactersStore";
import type { HunterCard } from "@/types";

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));

/** DM full edit of one hunter — vitals, level, Blood Tinge and items — written
 * via dmPatch (patchCharacter, partial merge) so the DM never clobbers their
 * own card. */
export function DMCharacterEditor({ card }: { card: HunterCard }) {
  const dmPatch = useCharactersStore((s) => s.dmPatch);
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  const sanMax = klass ? maxSanity(klass, card.abilities, card.level) : 0;
  const hp = Math.min(hpMax, card.currentHp ?? hpMax);
  const san = Math.min(sanMax, card.sanity ?? sanMax);

  /** A direct DM level grant. Raising keeps Insight at least at the new
   * level's threshold (so "N to next level" stays sensible) and arms the
   * player's level-up walkthrough; lowering also caps Insight below the next
   * threshold so the reduction STICKS (a rest can't silently re-level), and
   * never rewinds lastSeenLevel — a level the player already walked is never
   * walked (and its choices never re-applied) twice. */
  function setLevel(v: number) {
    const level = clamp(1, 20, v);
    const insight = card.insight ?? 0;
    dmPatch(card.id, {
      level,
      lastSeenLevel: card.lastSeenLevel ?? card.level,
      insight:
        level > card.level
          ? Math.max(insight, INSIGHT_THRESHOLDS[level - 1])
          : level < card.level && level < 20
            ? Math.min(insight, INSIGHT_THRESHOLDS[level] - 1)
            : insight,
    });
  }

  // A sheet hunter lives on its paper sheet — HP/Sanity/Transformation/Blood
  // Tinge/items/gold are tracked there, so app-side steppers would only fight
  // the sheet. The DM keeps the Level grant (card.level is the mirror the
  // lists read; Insight sits on the row outside this editor).
  if (isSheetCard(card)) {
    return (
      <div style={{ marginTop: 8 }}>
        <p className="faint" style={{ fontSize: "0.84rem", margin: "0 0 4px" }}>
          This hunter lives on its paper sheet — HP, Sanity, gear and gold are tracked on the sheet, not here.
        </p>
        <Stepper label="Level" value={card.level} onChange={setLevel} />
      </div>
    );
  }

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
      <TransformationEditor card={card} onPatch={(p) => dmPatch(card.id, p)} divider="top" />
      <Stepper label="Level" value={card.level} onChange={setLevel} />
      <div className="row between" style={{ padding: "6px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Blood Tinge</span>
        <button
          className={`btn btn-sm${card.bloodTinge ? " btn-primary" : " btn-ghost"}`}
          style={{ width: "auto", minWidth: 84 }}
          aria-pressed={!!card.bloodTinge}
          onClick={() => dmPatch(card.id, { bloodTinge: !card.bloodTinge })}
        >
          {card.bloodTinge ? "● Held" : "○ Grant"}
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <InventorySection card={card} dmMode onPatch={(p) => dmPatch(card.id, p)} />
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
