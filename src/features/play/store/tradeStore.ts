import { create } from "zustand";
import type { Trade } from "@/types";
import {
  subscribeCampaignTrades,
  createTrade,
  acceptTrade,
  declineTrade,
  cancelTrade,
  type CreateTradeInput,
} from "@/api/trades";
import { isPreviewActive, previewTrades } from "@/dev/preview";

interface TradeState {
  trades: Trade[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsub: (() => void) | null;
  _campaignId: string | null;

  sync: (campaignId: string | null) => void;
  stop: () => void;
  clearError: () => void;

  propose: (input: CreateTradeInput) => Promise<string | null>;
  accept: (id: string) => Promise<boolean>;
  decline: (id: string) => Promise<boolean>;
  cancel: (id: string) => Promise<boolean>;
}

export const useTradeStore = create<TradeState>((set, get) => {
  async function run<T>(fn: () => Promise<T>, msg: string): Promise<T | null> {
    set({ busy: true, error: null });
    try {
      const out = await fn();
      set({ busy: false });
      return out;
    } catch (err) {
      console.error(msg, err);
      set({ busy: false, error: msg });
      return null;
    }
  }

  return {
    trades: [],
    busy: false,
    error: null,
    preview: false,
    _unsub: null,
    _campaignId: null,

    sync: (campaignId) => {
      if (isPreviewActive()) {
        if (!get().preview) set({ preview: true, trades: previewTrades() });
        return;
      }
      if (campaignId === get()._campaignId && get()._unsub) return;
      get()._unsub?.();
      if (!campaignId) {
        set({ _unsub: null, _campaignId: null, trades: [] });
        return;
      }
      set({ _campaignId: campaignId, trades: [] });
      const unsub = subscribeCampaignTrades(
        campaignId,
        (trades) => set({ trades }),
        () => set({ error: "Couldn't load trades." }),
      );
      set({ _unsub: unsub });
    },

    stop: () => {
      get()._unsub?.();
      set({ _unsub: null, _campaignId: null });
    },

    clearError: () => set({ error: null }),

    propose: async (input) => {
      if (get().preview) {
        const now = Date.now();
        const t: Trade = {
          id: `preview-trade-${now}`,
          ...input,
          status: "pending",
          error: null,
          createdAt: now,
          updatedAt: now,
          settledAt: null,
        };
        set((s) => ({ trades: [t, ...s.trades] }));
        return t.id;
      }
      return run(() => createTrade(input), "Couldn't send the trade.");
    },

    accept: async (id) => {
      if (get().preview) {
        // The Cloud Function settles for real; in preview, fake it.
        set((s) => ({ trades: s.trades.map((t) => (t.id === id ? { ...t, status: "settled", settledAt: Date.now() } : t)) }));
        return true;
      }
      return (await run(() => acceptTrade(id), "Couldn't accept the trade.")) !== null;
    },

    decline: async (id) => {
      if (get().preview) {
        set((s) => ({ trades: s.trades.map((t) => (t.id === id ? { ...t, status: "declined" } : t)) }));
        return true;
      }
      return (await run(() => declineTrade(id), "Couldn't decline the trade.")) !== null;
    },

    cancel: async (id) => {
      if (get().preview) {
        set((s) => ({ trades: s.trades.map((t) => (t.id === id ? { ...t, status: "cancelled" } : t)) }));
        return true;
      }
      return (await run(() => cancelTrade(id), "Couldn't cancel the trade.")) !== null;
    },
  };
});
