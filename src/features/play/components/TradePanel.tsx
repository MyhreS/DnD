import { useState, type CSSProperties } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { AsyncButton } from "@/components/AsyncButton";
import { useTradeStore } from "../store/tradeStore";
import { NewTradeForm } from "./NewTradeForm";
import { summarizeSide, TRADE_STATUS_LABEL, isLiveTrade } from "../lib/trade";
import type { Game, GameParticipant, HunterCard } from "@/types";

const miniLabel: CSSProperties = {
  fontSize: "0.7rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginTop: 12,
};

/** Player trading hub: offers to you, your offers, recent history, and a builder. */
export function TradePanel({
  game,
  participants,
  card,
}: {
  game: Game;
  participants: GameParticipant[];
  card: HunterCard;
}) {
  const uid = useAuthStore((s) => s.user?.uid) ?? "";
  const trades = useTradeStore((s) => s.trades);
  const accept = useTradeStore((s) => s.accept);
  const decline = useTradeStore((s) => s.decline);
  const cancel = useTradeStore((s) => s.cancel);
  const error = useTradeStore((s) => s.error);
  const [creating, setCreating] = useState(false);

  const incoming = trades.filter((t) => t.toUid === uid && t.status === "pending");
  const outgoing = trades.filter((t) => t.fromUid === uid && isLiveTrade(t.status));
  const recent = trades
    .filter((t) => (t.fromUid === uid || t.toUid === uid) && !isLiveTrade(t.status))
    .slice(0, 4);
  const others = participants.filter((p) => p.role === "player" && p.uid !== uid);

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Trading</p>
        {others.length > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={() => setCreating((c) => !c)}>
            {creating ? "Close" : "New trade"}
          </button>
        )}
      </div>

      {error && <div className="banner banner-error" style={{ marginBottom: 8 }}>{error}</div>}

      {creating && <NewTradeForm game={game} card={card} recipients={others} onDone={() => setCreating(false)} />}

      {incoming.length > 0 && (
        <>
          <p className="faint" style={miniLabel}>Offers to you</p>
          {incoming.map((t) => (
            <div key={t.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{t.fromName} offers a trade</div>
              <div className="muted" style={{ fontSize: "0.86rem" }}>You get: {summarizeSide(t.offer)}</div>
              <div className="muted" style={{ fontSize: "0.86rem" }}>You give: {summarizeSide(t.request)}</div>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <AsyncButton className="btn btn-ghost" pendingText="…" showDone={false} onClick={() => decline(t.id)}>Decline</AsyncButton>
                <AsyncButton className="btn btn-primary" pendingText="Accepting…" showDone={false} onClick={() => accept(t.id)}>Accept</AsyncButton>
              </div>
            </div>
          ))}
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <p className="faint" style={miniLabel}>Your offers</p>
          {outgoing.map((t) => (
            <div key={t.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                To {t.toName} — {TRADE_STATUS_LABEL[t.status]}
              </div>
              <div className="muted" style={{ fontSize: "0.86rem" }}>
                You give {summarizeSide(t.offer)} · for {summarizeSide(t.request)}
              </div>
              {t.status === "pending" ? (
                <AsyncButton className="btn btn-ghost btn-sm" style={{ marginTop: 6, color: "var(--blood-bright)" }} pendingText="…" showDone={false} onClick={() => cancel(t.id)}>
                  Cancel
                </AsyncButton>
              ) : (
                <div className="faint" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  <span className="btn-spinner" aria-hidden /> waiting for settlement…
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {recent.length > 0 && (
        <>
          <p className="faint" style={miniLabel}>Recent</p>
          {recent.map((t) => (
            <div key={t.id} className="row between" style={{ padding: "5px 0", fontSize: "0.82rem" }}>
              <span className="faint">{t.fromUid === uid ? `To ${t.toName}` : `From ${t.fromName}`}</span>
              <span style={{ flex: "none" }}>{TRADE_STATUS_LABEL[t.status]}{t.status === "failed" && t.error ? ` — ${t.error}` : ""}</span>
            </div>
          ))}
        </>
      )}

      {incoming.length === 0 && outgoing.length === 0 && !creating && (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>
          {others.length ? "No active trades. Tap “New trade” to offer a swap." : "No other hunters to trade with yet."}
        </p>
      )}
    </div>
  );
}
