import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useIsDM } from "@/features/campaigns/hooks/useIsDM";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "@/features/hunter/hooks/useHunterCard";
import { useShopStore } from "../store/shopStore";
import { useShopSync } from "../hooks/useShopSync";
import { ShopStorefront } from "./ShopStorefront";
import { SellPanel } from "./SellPanel";

/** The in-campaign shop. The DM stocks items at GP prices and settles sales;
 * players spend their hunter's coins to buy, or raise a (DM-priced) sell. */
export function ShopPage() {
  const isDM = useIsDM();
  const campaign = useCampaignStore((s) => s.active);
  const card = usePlayerStore((s) => s.card);
  const error = useShopStore((s) => s.error);

  useHunterCard();
  useShopSync();

  return (
    <div className="reading">
      <p className="eyebrow">The Market</p>
      <h1 className="page-title">Shop</h1>
      <p className="page-intro">
        {isDM
          ? "Stock the storefront and settle your hunters' sales."
          : `Spend your coin in ${campaign?.name ?? "the campaign"}.`}
      </p>

      {error && <div className="banner banner-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="stack" style={{ gap: 14 }}>
        <ShopStorefront isDM={isDM} card={card} campaignId={campaign?.id ?? null} />
        <SellPanel isDM={isDM} card={card} campaignId={campaign?.id ?? null} />
      </div>
    </div>
  );
}
