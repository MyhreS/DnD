import { useState } from "react";
import type { Game } from "@/types";
import { emptyShop, shopSummary } from "@/features/play/lib/shop";
import { useShopStore } from "@/features/play/store/shopStore";
import { ShopStockDialog } from "./ShopStockDialog";

/** The DM's shop controls, alongside the battle stage: stock a shop, open it on
 * the table's big screen, and close it again when the party moves on. */
export function SessionShopSection({ game, disabled }: { game: Game; disabled: boolean }) {
  const shop = game.shop ?? emptyShop();
  const busy = useShopStore((state) => state.busy);
  const save = useShopStore((state) => state.save);
  const openShop = useShopStore((state) => state.open);
  const closeShop = useShopStore((state) => state.close);
  const [editing, setEditing] = useState(false);
  const blocked = disabled || busy;

  return (
    <section className={`game-combat-stage game-shop-stage${shop.open ? " is-open" : ""}`} aria-labelledby="shop-heading">
      <div className="game-combat-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 9h16l-1 10H5L4 9Zm2-4h12l2 4H4l2-4Zm3 8v4m6-4v4" /></svg>
      </div>
      <div className="game-combat-copy">
        <p className="eyebrow">{shop.open ? "Shop open" : shop.lines.length > 0 ? "Shop closed" : "Wares"}</p>
        <h3 id="shop-heading">{shop.open ? (shop.name ? `${shop.name} is open` : "The shop is on the big screen") : shop.lines.length > 0 ? "Reopen the shop" : "Open a shop"}</h3>
        <p>{shop.open ? `${shopSummary(shop)} · players can see it` : shopSummary(shop)}</p>
      </div>
      <div className="game-combat-actions">
        {shop.open ? (<>
          <button className="btn btn-primary" type="button" disabled={blocked} onClick={() => setEditing(true)}>Edit shop</button>
          <button className="game-text-button" type="button" disabled={blocked} onClick={() => void closeShop(game.id, shop)}>Close shop</button>
        </>) : (
          <button className="btn btn-primary" type="button" disabled={blocked} onClick={() => setEditing(true)}>
            {shop.lines.length > 0 ? "Reopen shop" : "Open shop"}
          </button>
        )}
      </div>
      {editing && (
        <ShopStockDialog
          shop={shop}
          busy={blocked}
          onSave={(next) => save(game.id, next)}
          onOpenShop={(next) => openShop(game.id, next)}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}
