import { HapticTap } from "@/components/HapticTap";
import { useState } from "react";
import { requestShopPurchase } from "@/api/shopRequests";
import { lineItem } from "@/features/play/lib/shop";
import { haptic } from "@/lib/haptics";
import type { Game } from "@/types";
import { useRequestStatusHaptics } from "../hooks/useRequestStatusHaptics";
import { useSeenShopLines } from "../hooks/useSeenShopLines";
import { useShopRequests } from "../hooks/useShopRequests";

/** The DM's open shop as a player sees it: what is for sale, what is new, and
 * "Ask to buy" — the DM approves before gold and item change hands. */
export function PlayerShopPanel({ game, characterId, coins, live }: { game: Game; characterId: string | null | undefined; coins: number; live: boolean }) {
  const shop = game.shop;
  const lines = shop?.open ? shop.lines : [];
  const { fresh, markSeen } = useSeenShopLines(game.id, lines.map((line) => line.id));
  const requests = useShopRequests(game.id, live).filter((request) => request.characterId === characterId);
  useRequestStatusHaptics(requests);
  const [asking, setAsking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!shop?.open || lines.length === 0) return null;
  const freshNames = lines.filter((line) => fresh.has(line.id)).map((line) => line.name);

  async function ask(lineId: string, name: string) {
    if (!characterId) return;
    setAsking(lineId);
    setMessage("");
    try {
      await requestShopPurchase(game.id, lineId, characterId);
      haptic("light");
      setMessage(`Asked ${game.dmName} to buy ${name}. You'll see the answer here.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The request could not be sent.");
    } finally {
      setAsking(null);
    }
  }

  return <section className="game-focus-panel player-shop" aria-labelledby="player-shop-title">
    <header>
      <div><p className="eyebrow">Shop open</p><h3 id="player-shop-title">{shop.name || "The shop"}</h3></div>
      <span className="player-shop-purse">{coins} GP</span>
    </header>
    {freshNames.length > 0 && <div className="player-shop-new" role="status">
      <span aria-hidden="true">✦</span>
      <p><b>{game.dmName} just added</b> {freshNames.join(", ")}</p>
      <button type="button" onClick={markSeen}>Got it</button>
    </div>}
    {message && <p className="player-shop-message" role="status">{message}</p>}
    <div className="player-shop-grid">
      {lines.map((line) => {
        const item = lineItem(line);
        const latest = requests.find((request) => request.lineId === line.id);
        const pending = latest?.status === "pending";
        const tooPoor = coins < line.priceGp;
        return <article key={line.id} className={`player-shop-item${fresh.has(line.id) ? " is-new" : ""}`}>
          {fresh.has(line.id) && <span className="player-shop-badge">New</span>}
          <div><strong>{line.name}</strong><small>{item ? `${item.category} · ${item.carry} · ${item.weightLb} lb` : "Curiosity"}</small>{line.note && <em>{line.note}</em>}</div>
          <b className="player-shop-price">{line.priceGp} GP</b>
          {latest?.status === "approved" && <span className="player-shop-status is-approved">Bought ✓ — in your inventory</span>}
          {latest?.status === "declined" && <span className="player-shop-status is-declined">{game.dmName} said no</span>}
          <HapticTap disabled={!live || !characterId || pending || tooPoor || asking === line.id}>
            <button type="button" className="btn btn-primary" disabled={!live || !characterId || pending || tooPoor || asking === line.id} onClick={() => void ask(line.id, line.name)}>
              {pending ? `Waiting for ${game.dmName}…` : asking === line.id ? "Asking…" : tooPoor ? "Not enough gold" : latest ? "Ask to buy another" : "Ask to buy"}
            </button>
          </HapticTap>
        </article>;
      })}
    </div>
  </section>;
}
