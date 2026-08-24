import { create } from "zustand";
import { subscribeAllCharacters } from "@/api/players";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { explain } from "@/lib/errors";
import { isPreviewActive, previewPartyCards } from "@/dev/preview";
import type { HunterCard } from "@/types";

interface CharactersState {
  party: HunterCard[];
  error: string | null;
  preview: boolean;
  _unsubParty: (() => void) | null;
  /** Multiple screens share this subscription. */
  _refs: number;
  sync: () => void;
  stop: () => void;
}

/** Read-only party projection used by the game and table-status screens.
 * Character values are edited only through the current source sheet. */
export const useCharactersStore = create<CharactersState>((set, get) => ({
  party: [],
  error: null,
  preview: false,
  _unsubParty: null,
  _refs: 0,

  sync: () => {
    set((state) => ({ _refs: state._refs + 1 }));
    if (get()._unsubParty || get().preview) return;
    if (isPreviewActive()) {
      set({ preview: true, party: previewPartyCards() });
      return;
    }
    const campaignId = useCampaignStore.getState().activeId;
    const unsubscribe = subscribeAllCharacters(
      (party) => set({ party, error: null }),
      (error) => set({ error: explain("Couldn't load characters", error) }),
      campaignId,
    );
    set({ _unsubParty: unsubscribe });
  },

  stop: () => {
    const refs = Math.max(0, get()._refs - 1);
    set({ _refs: refs });
    if (refs > 0) return;
    get()._unsubParty?.();
    set({ _unsubParty: null });
  },
}));
