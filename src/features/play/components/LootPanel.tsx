import { AsyncButton } from "@/components/AsyncButton";
import { useLootStore } from "../store/lootStore";
import { summarizeSide } from "../lib/trade";
import type { HunterCard } from "@/types";

/** Dropped loot from fallen hunters. Players with a hunter can claim it. */
export function LootPanel({ gameId, card }: { gameId: string; card?: HunterCard }) {
  const loot = useLootStore((s) => s.loot);
  const claim = useLootStore((s) => s.claim);
  const error = useLootStore((s) => s.error);

  const unclaimed = loot.filter((l) => l.status === "unclaimed");
  const claimed = loot.filter((l) => l.status === "claimed");
  if (loot.length === 0) return null;

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Dropped loot</p>
      {error && <div className="banner banner-error" style={{ marginBottom: 8 }}>{error}</div>}

      {unclaimed.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>Nothing left to claim.</p>
      ) : (
        unclaimed.map((l) => (
          <div key={l.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{l.fromName}'s remains</div>
            <div className="muted" style={{ fontSize: "0.86rem" }}>{summarizeSide({ items: l.items, coins: l.coins })}</div>
            {card && (
              <AsyncButton
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 6, width: "auto" }}
                pendingText="Claiming…"
                showDone={false}
                onClick={() => claim(l, card, gameId)}
              >
                Claim
              </AsyncButton>
            )}
          </div>
        ))
      )}

      {claimed.map((l) => (
        <div key={l.id} className="row between" style={{ padding: "5px 0", fontSize: "0.8rem", borderTop: "1px solid var(--border)" }}>
          <span className="faint">{l.fromName}'s remains</span>
          <span className="faint" style={{ flex: "none" }}>claimed by {l.claimedByName ?? "someone"}</span>
        </div>
      ))}
    </div>
  );
}
