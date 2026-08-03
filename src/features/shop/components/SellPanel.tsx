import { useState } from "react";
import type { HunterCard, SellRequest } from "@/types";
import { ITEM_BY_ID } from "@/data/items";
import { resolveInventory } from "@/lib/inventory";
import { AsyncButton } from "@/components/AsyncButton";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCharactersStore } from "@/features/play/store/charactersStore";
import { useCharactersSync } from "@/features/play/hooks/useCharactersSync";
import { useShopStore } from "../store/shopStore";

/** Selling: players raise a request for an item they own; the DM enters a price
 * and approves (which credits the seller's gold) or declines. */
export function SellPanel({
  isDM,
  card,
  campaignId,
}: {
  isDM: boolean;
  card: HunterCard | null;
  campaignId: string | null;
}) {
  return <div className="card">{isDM ? <DMSellQueue /> : <PlayerSell card={card} campaignId={campaignId} />}</div>;
}

/** Player view: pick an item from your inventory, request to sell it, and watch
 * your pending requests' status. */
function PlayerSell({ card, campaignId }: { card: HunterCard | null; campaignId: string | null }) {
  const uid = useAuthStore((s) => s.user?.uid) ?? "";
  const sellRequests = useShopStore((s) => s.sellRequests);
  const requestSell = useShopStore((s) => s.requestSell);
  const [selId, setSelId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const entries = card ? resolveInventory(card) : [];
  const selected = entries.find((e) => e.item.id === selId) ?? null;
  const myPending = sellRequests.filter((r) => r.sellerUid === uid && (r.status === "requested" || r.status === "priced"));

  async function submit() {
    if (!card || !campaignId || !selected) return;
    const n = Math.min(Math.max(1, qty), selected.qty);
    const ok = await requestSell(campaignId, card, selected.item.id, n);
    if (ok) {
      setSelId(null);
      setQty(1);
    }
  }

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Sell your gear</p>
      {!card ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>Bring a hunter into this campaign to sell.</p>
      ) : entries.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>Nothing to sell — your pack is empty.</p>
      ) : (
        <>
          <div className="stack" style={{ gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {entries.map(({ item, qty: owned }) => (
              <button
                key={item.id}
                type="button"
                className="row between card-hover"
                style={{
                  background: "var(--bg-elev-2)",
                  border: `1px solid ${selId === item.id ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  gap: 8,
                  textAlign: "left",
                }}
                onClick={() => {
                  setSelId(item.id);
                  setQty((n) => Math.min(Math.max(1, n), owned));
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.name}</span>{" "}
                  <span className="faint" style={{ fontSize: "0.74rem" }}>×{owned}</span>
                </span>
                <span className="faint" style={{ flex: "none", fontSize: "0.74rem" }}>{item.category}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="row" style={{ gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              <span className="faint" style={{ fontSize: "0.8rem" }}>Qty</span>
              <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label="sell fewer" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
              <span style={{ minWidth: 24, textAlign: "center" }}>{Math.min(qty, selected.qty)}</span>
              <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label="sell more" onClick={() => setQty((n) => Math.min(selected.qty, n + 1))}>+</button>
              <AsyncButton className="btn btn-primary btn-sm" style={{ width: "auto" }} pendingText="Requesting…" showDone={false} onClick={submit}>
                Request to sell
              </AsyncButton>
            </div>
          )}
        </>
      )}

      {myPending.length > 0 && (
        <>
          <hr className="divider" />
          <p className="faint" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Your requests</p>
          {myPending.map((r) => {
            const item = ITEM_BY_ID[r.itemId];
            return (
              <div key={r.id} style={{ padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {item?.name ?? r.itemId}{r.qty > 1 && <span className="faint"> ×{r.qty}</span>}
                </div>
                <div className="muted" style={{ fontSize: "0.82rem" }}>
                  {r.status === "priced" ? `Priced: ${r.priceGp} GP — awaiting approval` : "Awaiting a price from the DM"}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

/** DM view: the queue of open sell requests to price + settle. */
function DMSellQueue() {
  useCharactersSync();
  const party = useCharactersStore((s) => s.party);
  const sellRequests = useShopStore((s) => s.sellRequests);
  const pending = sellRequests.filter((r) => r.status === "requested" || r.status === "priced");

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Sell requests</p>
      {pending.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>No sell requests right now.</p>
      ) : (
        pending.map((r) => <SellRequestRow key={r.id} req={r} sellerCard={party.find((c) => c.id === r.characterId) ?? null} />)
      )}
    </>
  );
}

/** One DM row: set a price, then Approve (credits the seller) or Decline. */
function SellRequestRow({ req, sellerCard }: { req: SellRequest; sellerCard: HunterCard | null }) {
  const priceSell = useShopStore((s) => s.priceSell);
  const approveSell = useShopStore((s) => s.approveSell);
  const declineSell = useShopStore((s) => s.declineSell);
  const [price, setPrice] = useState(req.priceGp ?? 0);
  const item = ITEM_BY_ID[req.itemId];
  const priced = req.priceGp != null;

  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
        {item?.name ?? req.itemId}{req.qty > 1 && <span className="faint"> ×{req.qty}</span>}
      </div>
      <div className="faint" style={{ fontSize: "0.78rem" }}>
        from {req.sellerName}{priced ? ` · priced ${req.priceGp} GP each` : ""}
      </div>
      <div className="row" style={{ gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        <input
          className="input"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
          style={{ width: 80 }}
          aria-label={`price for ${item?.name ?? req.itemId}`}
        />
        <AsyncButton className="btn btn-ghost btn-sm" style={{ width: "auto" }} pendingText="…" showDone={false} onClick={() => priceSell(req.id, price)}>
          Set price
        </AsyncButton>
        <AsyncButton
          className="btn btn-primary btn-sm"
          style={{ width: "auto" }}
          pendingText="…"
          showDone={false}
          disabled={!priced || !sellerCard}
          onClick={() => (sellerCard ? approveSell(req, sellerCard) : undefined)}
        >
          Approve
        </AsyncButton>
        <AsyncButton className="btn btn-ghost btn-sm" style={{ width: "auto", color: "var(--blood-bright)" }} pendingText="…" showDone={false} onClick={() => declineSell(req.id)}>
          Decline
        </AsyncButton>
      </div>
      {!sellerCard && <p className="faint" style={{ fontSize: "0.74rem", marginTop: 4, marginBottom: 0 }}>Seller's hunter is unavailable.</p>}
    </div>
  );
}
