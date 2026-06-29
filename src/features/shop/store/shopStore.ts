import { create } from "zustand";
import type { HunterCard, ShopListing, SellRequest } from "@/types";
import {
  subscribeListings,
  addListing as apiAddListing,
  removeListing as apiRemoveListing,
  buyListing,
  subscribeSellRequests,
  createSellRequest,
  priceSellRequest,
  approveSellRequest,
  declineSellRequest,
} from "@/api/shop";
import { useAuthStore } from "@/features/auth/store/authStore";
import { isPreviewActive, previewShopListings, previewSellRequests } from "@/dev/preview";

interface ShopState {
  listings: ShopListing[];
  sellRequests: SellRequest[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsubListings: (() => void) | null;
  _unsubSells: (() => void) | null;
  _campaignId: string | null;

  sync: (campaignId: string | null) => void;
  stop: () => void;
  /** DM: stock a catalog item at a GP price. */
  addListing: (campaignId: string, itemId: string, priceGp: number) => Promise<boolean>;
  /** DM: pull an item from the storefront. */
  removeListing: (id: string) => Promise<boolean>;
  /** Player: buy a listing into your own hunter's inventory. */
  buy: (listing: ShopListing, card: HunterCard) => Promise<boolean>;
  /** Player: raise a request to sell an item you own (DM prices it). */
  requestSell: (campaignId: string, card: HunterCard, itemId: string, qty: number) => Promise<boolean>;
  /** DM: set the price on a sell request. */
  priceSell: (id: string, priceGp: number) => Promise<boolean>;
  /** DM: approve a priced request — credits the seller. */
  approveSell: (req: SellRequest, card: HunterCard) => Promise<boolean>;
  /** DM: decline a sell request. */
  declineSell: (id: string) => Promise<boolean>;
}

export const useShopStore = create<ShopState>((set, get) => {
  async function run(fn: () => Promise<unknown>, msg: string): Promise<boolean> {
    set({ busy: true, error: null });
    try {
      await fn();
      set({ busy: false });
      return true;
    } catch (err) {
      console.error(msg, err);
      set({ busy: false, error: err instanceof Error ? err.message : msg });
      return false;
    }
  }

  return {
    listings: [],
    sellRequests: [],
    busy: false,
    error: null,
    preview: false,
    _unsubListings: null,
    _unsubSells: null,
    _campaignId: null,

    sync: (campaignId) => {
      if (isPreviewActive()) {
        if (!get().preview) {
          set({ preview: true, listings: previewShopListings(), sellRequests: previewSellRequests() });
        }
        return;
      }
      if (campaignId === get()._campaignId && get()._unsubListings) return;
      get()._unsubListings?.();
      get()._unsubSells?.();
      if (!campaignId) {
        set({ _unsubListings: null, _unsubSells: null, _campaignId: null, listings: [], sellRequests: [] });
        return;
      }
      set({ _campaignId: campaignId, listings: [], sellRequests: [] });
      const ul = subscribeListings(
        campaignId,
        (listings) => set({ listings }),
        () => set({ error: "Couldn't load the shop." }),
      );
      const us = subscribeSellRequests(
        campaignId,
        (sellRequests) => set({ sellRequests }),
        () => set({ error: "Couldn't load sell requests." }),
      );
      set({ _unsubListings: ul, _unsubSells: us });
    },

    stop: () => {
      get()._unsubListings?.();
      get()._unsubSells?.();
      set({ _unsubListings: null, _unsubSells: null, _campaignId: null });
    },

    addListing: async (campaignId, itemId, priceGp) => {
      if (get().preview) {
        set((s) => ({
          listings: [
            { id: `prev-listing-${itemId}-${Date.now()}`, campaignId, itemId, priceGp, createdBy: "preview-uid", createdAt: Date.now() },
            ...s.listings,
          ],
        }));
        return true;
      }
      const createdBy = useAuthStore.getState().user?.uid ?? "";
      return run(() => apiAddListing(campaignId, { itemId, priceGp, createdBy }), "Couldn't add the item.");
    },

    removeListing: async (id) => {
      if (get().preview) {
        set((s) => ({ listings: s.listings.filter((l) => l.id !== id) }));
        return true;
      }
      return run(() => apiRemoveListing(id), "Couldn't remove the item.");
    },

    buy: async (listing, card) => {
      if (get().preview) return true; // the card lives in playerStore — no-op in preview
      return run(() => buyListing(listing, card), "Couldn't buy that.");
    },

    requestSell: async (campaignId, card, itemId, qty) => {
      if (get().preview) {
        set((s) => ({
          sellRequests: [
            {
              id: `prev-sell-${itemId}-${Date.now()}`,
              campaignId,
              sellerUid: card.ownerUid,
              sellerName: card.name,
              characterId: card.id,
              itemId,
              qty,
              priceGp: null,
              status: "requested",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              settledAt: null,
            },
            ...s.sellRequests,
          ],
        }));
        return true;
      }
      return run(
        () => createSellRequest(campaignId, { sellerUid: card.ownerUid, sellerName: card.name, characterId: card.id, itemId, qty }),
        "Couldn't request the sale.",
      );
    },

    priceSell: async (id, priceGp) => {
      if (get().preview) {
        set((s) => ({
          sellRequests: s.sellRequests.map((r) => (r.id === id ? { ...r, priceGp, status: "priced", updatedAt: Date.now() } : r)),
        }));
        return true;
      }
      return run(() => priceSellRequest(id, priceGp), "Couldn't set the price.");
    },

    approveSell: async (req, card) => {
      if (get().preview) {
        set((s) => ({
          sellRequests: s.sellRequests.map((r) =>
            r.id === req.id ? { ...r, status: "approved", settledAt: Date.now(), updatedAt: Date.now() } : r,
          ),
        }));
        return true;
      }
      return run(() => approveSellRequest(req, card), "Couldn't approve the sale.");
    },

    declineSell: async (id) => {
      if (get().preview) {
        set((s) => ({
          sellRequests: s.sellRequests.map((r) => (r.id === id ? { ...r, status: "declined", updatedAt: Date.now() } : r)),
        }));
        return true;
      }
      return run(() => declineSellRequest(id), "Couldn't decline.");
    },
  };
});
