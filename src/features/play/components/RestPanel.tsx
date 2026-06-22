import { getClass } from "@/data/classes";
import { maxHp } from "@/lib/character";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { AsyncButton } from "@/components/AsyncButton";
import type { GamePhase, HunterCard } from "@/types";

/** Shown to a player when the DM calls a rest. Short rest heals half your max
 * HP; long rest restores you to full. (Self-hides outside a rest phase.) */
export function RestPanel({ card, phase }: { card: HunterCard; phase: GamePhase }) {
  const save = usePlayerStore((s) => s.save);
  const klass = getClass(card.classId);
  if ((phase !== "short_rest" && phase !== "long_rest") || !klass) return null;

  const hpMax = maxHp(klass, card.abilities, card.level);
  const hp = card.currentHp ?? hpMax;
  const isLong = phase === "long_rest";
  const restedHp = isLong ? hpMax : Math.min(hpMax, hp + Math.ceil(hpMax / 2));
  const atFull = hp >= hpMax;

  return (
    <div className="card" style={{ borderColor: "var(--gold-dim)" }}>
      <p className="eyebrow" style={{ marginBottom: 6 }}>{isLong ? "Long Rest" : "Short Rest"}</p>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.92rem" }}>
        {isLong
          ? "The party beds down. Recover to full Hit Points and reset your per-rest abilities."
          : "The party catches its breath. Recover some Hit Points and short-rest abilities."}
      </p>
      {atFull ? (
        <p className="faint" style={{ fontSize: "0.86rem", margin: 0 }}>You're already at full HP ({hp}/{hpMax}).</p>
      ) : (
        <AsyncButton
          className="btn btn-primary"
          pendingText="Resting…"
          showDone={false}
          onClick={() => save({ ...card, currentHp: restedHp })}
        >
          Take the {isLong ? "long" : "short"} rest · HP {hp} → {restedHp}
        </AsyncButton>
      )}
    </div>
  );
}
