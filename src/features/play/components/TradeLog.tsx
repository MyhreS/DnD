import { useTradeStore } from "../store/tradeStore";
import { summarizeSide, TRADE_STATUS_LABEL } from "../lib/trade";
import type { TradeStatus } from "@/types";

const STATUS_COLOR: Partial<Record<TradeStatus, string>> = {
  settled: "var(--ok)",
  failed: "var(--blood-bright)",
  declined: "var(--ink-faint)",
  cancelled: "var(--ink-faint)",
};

/** DM-only: a live log of every trade in the game. */
export function TradeLog() {
  const trades = useTradeStore((s) => s.trades);

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Trade log</p>
      {trades.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>No trades yet.</p>
      ) : (
        <div className="stack" style={{ gap: 0 }}>
          {trades.map((t) => (
            <div key={t.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div className="row between" style={{ gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {t.fromName} → {t.toName}
                </span>
                <span style={{ flex: "none", fontSize: "0.78rem", color: STATUS_COLOR[t.status] ?? "var(--gold)" }}>
                  {TRADE_STATUS_LABEL[t.status]}
                </span>
              </div>
              <div className="faint" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                Gives {summarizeSide(t.offer)} · wants {summarizeSide(t.request)}
              </div>
              {t.status === "failed" && t.error && (
                <div style={{ fontSize: "0.78rem", color: "var(--blood-bright)", marginTop: 2 }}>{t.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
