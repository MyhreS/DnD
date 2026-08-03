import { useState } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { AsyncButton } from "@/components/AsyncButton";
import { ITEMS, ITEM_BY_ID } from "@/data/items";
import { resolveInventory } from "@/lib/inventory";
import { useTradeStore } from "../store/tradeStore";
import type { Game, GameParticipant, HunterCard, InventoryEntry } from "@/types";

/** Build and send a trade offer to another hunter. */
export function NewTradeForm({
  game,
  card,
  recipients,
  onDone,
}: {
  game: Game;
  card: HunterCard;
  recipients: GameParticipant[];
  onDone: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const propose = useTradeStore((s) => s.propose);

  const [toUid, setToUid] = useState(recipients[0]?.uid ?? "");
  const [offer, setOffer] = useState<Record<string, number>>({});
  const [offerCoins, setOfferCoins] = useState(0);
  const [request, setRequest] = useState<Record<string, number>>({});
  const [requestCoins, setRequestCoins] = useState(0);
  const [q, setQ] = useState("");

  const owned = resolveInventory(card);
  const coins = card.coins ?? 0;
  const toEntries = (m: Record<string, number>): InventoryEntry[] =>
    Object.entries(m).filter(([, n]) => n > 0).map(([itemId, qty]) => ({ itemId, qty }));

  const offerItems = toEntries(offer);
  const requestItems = toEntries(request);
  const hasSomething = offerItems.length > 0 || offerCoins > 0 || requestItems.length > 0 || requestCoins > 0;
  const recipient = recipients.find((r) => r.uid === toUid);

  const matches = q.trim()
    ? ITEMS.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  async function send() {
    if (!user || !recipient || !hasSomething) return;
    const id = await propose({
      campaignId: game.campaignId,
      gameId: game.id,
      fromUid: user.uid,
      fromName: card.name || "Hunter",
      toUid: recipient.uid,
      toName: recipient.name,
      offer: { items: offerItems, coins: offerCoins },
      request: { items: requestItems, coins: requestCoins },
      sandbox: game.sandbox,
    });
    if (id) onDone();
  }

  return (
    <div className="card" style={{ background: "var(--bg-elev-2)", marginBottom: 10 }}>
      <div className="field">
        <label>Trade with</label>
        <select className="select" value={toUid} onChange={(e) => setToUid(e.target.value)}>
          {recipients.map((r) => (
            <option key={r.uid} value={r.uid}>{r.name}</option>
          ))}
        </select>
      </div>

      <p className="faint" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "6px 0 4px" }}>You give</p>
      {owned.length === 0 && <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>You have no items to give.</p>}
      {owned.map(({ item, qty }) => (
        <QtyRow key={item.id} label={item.name} value={offer[item.id] ?? 0} max={qty}
          onChange={(v) => setOffer((m) => ({ ...m, [item.id]: v }))} />
      ))}
      <QtyRow label="Coins (GP)" value={offerCoins} max={coins} onChange={setOfferCoins} />

      <p className="faint" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "10px 0 4px" }}>You want</p>
      {requestItems.map((e) => (
        <QtyRow key={e.itemId} label={ITEM_BY_ID[e.itemId]?.name ?? e.itemId} value={e.qty} max={20}
          onChange={(v) => setRequest((m) => ({ ...m, [e.itemId]: v }))} />
      ))}
      <QtyRow label="Coins (GP)" value={requestCoins} max={9999} onChange={setRequestCoins} />
      <input className="input" placeholder="Add an item to request…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 8 }} />
      {matches.length > 0 && (
        <div className="stack" style={{ gap: 4, marginTop: 6 }}>
          {matches.map((i) => (
            <button key={i.id} type="button" className="row between card-hover"
              style={{ background: "var(--bg-elev-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 10px", textAlign: "left" }}
              onClick={() => { setRequest((m) => ({ ...m, [i.id]: (m[i.id] ?? 0) + 1 })); setQ(""); }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{i.name}</span>
              <span className="gold" style={{ flex: "none", fontSize: "0.8rem" }}>+ Add</span>
            </button>
          ))}
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <AsyncButton className="btn btn-primary" pendingText="Sending…" showDone={false} disabled={!recipient || !hasSomething} onClick={send}>
          Send offer
        </AsyncButton>
      </div>
    </div>
  );
}

function QtyRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="row between" style={{ padding: "4px 0", gap: 8 }}>
      <span style={{ fontSize: "0.88rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div className="row" style={{ gap: 6, flex: "none", alignItems: "center" }}>
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 28, padding: 4 }} disabled={value <= 0} aria-label={`less ${label}`} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <span style={{ minWidth: 22, textAlign: "center", fontFamily: "var(--font-display)" }}>{value}</span>
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 28, padding: 4 }} disabled={value >= max} aria-label={`more ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
