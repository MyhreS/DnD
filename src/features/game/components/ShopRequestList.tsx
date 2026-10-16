import { useState } from "react";
import { resolveShopPurchase } from "@/api/shopRequests";
import { haptic } from "@/lib/haptics";
import { useShopRequests } from "../hooks/useShopRequests";

/** The DM's queue of purchase requests: approve takes the gold and gives the
 * item; decline just answers. */
export function ShopRequestList({ gameId, live }: { gameId: string; live: boolean }) {
  const pending = useShopRequests(gameId, live).filter((request) => request.status === "pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (pending.length === 0) return null;

  async function answer(requestId: string, approve: boolean) {
    setBusy(requestId);
    setError("");
    try {
      await resolveShopPurchase(gameId, requestId, approve);
      haptic(approve ? "success" : "selection");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not answer the request.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="shop-requests" role="region" aria-label="Purchase requests">
    <p className="shop-requests-title"><span aria-hidden="true">!</span>{pending.length} purchase request{pending.length === 1 ? "" : "s"} waiting</p>
    {error && <p className="banner-error" role="alert">{error}</p>}
    {pending.map((request) => <article key={request.id}>
      <span><b>{request.characterName}</b> wants <b>{request.lineName}</b> for {request.priceGp} GP</span>
      <div>
        <button type="button" className="btn btn-primary" disabled={busy === request.id} onClick={() => void answer(request.id, true)}>Approve</button>
        <button type="button" className="btn btn-ghost" disabled={busy === request.id} onClick={() => void answer(request.id, false)}>Decline</button>
      </div>
    </article>)}
  </div>;
}
