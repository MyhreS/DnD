import { create } from "zustand";
import type { ArchivedCharacter, HunterCard } from "@/types";
import {
  subscribeAllCharacters,
  subscribeArchive,
  archiveCharacter,
  recoverCharacter,
  patchCharacter,
  awardInsight as apiAwardInsight,
} from "@/api/players";
import { createLoot } from "@/api/games";
import { isPreviewActive, previewPartyCards, previewArchive } from "@/dev/preview";

interface CharactersState {
  party: HunterCard[];
  archive: ArchivedCharacter[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsubParty: (() => void) | null;
  _unsubArchive: (() => void) | null;

  sync: () => void;
  stop: () => void;

  /** DM: confirm a pending death, or force-mark a character dead (override). */
  killCharacter: (card: HunterCard, gameId: string | null) => Promise<boolean>;
  /** DM: deny a pending death (revive to alive). */
  revive: (uid: string) => Promise<boolean>;
  /** DM: recover an archived character back into play. */
  recover: (a: ArchivedCharacter) => Promise<boolean>;
  /** DM: award (or subtract) Insight atomically — never loses rapid taps. The
   * award path goes through the api, never the owner's playerStore, so the DM
   * editing someone else's hunter doesn't clobber their own selected card. */
  awardInsight: (id: string, delta: number) => Promise<boolean>;
}

export const useCharactersStore = create<CharactersState>((set, get) => {
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
    party: [],
    archive: [],
    busy: false,
    error: null,
    preview: false,
    _unsubParty: null,
    _unsubArchive: null,

    sync: () => {
      if (get()._unsubParty || get().preview) return;
      if (isPreviewActive()) {
        set({ preview: true, party: previewPartyCards(), archive: previewArchive() });
        return;
      }
      const unsubParty = subscribeAllCharacters(
        (party) => set({ party }),
        () => set({ error: "Couldn't load characters." }),
      );
      const unsubArchive = subscribeArchive((archive) => set({ archive }));
      set({ _unsubParty: unsubParty, _unsubArchive: unsubArchive });
    },

    stop: () => {
      get()._unsubParty?.();
      get()._unsubArchive?.();
      set({ _unsubParty: null, _unsubArchive: null });
    },

    killCharacter: async (card, gameId) => {
      if (get().preview) {
        set((s) => ({
          party: s.party.filter((c) => c.id !== card.id),
          archive: [
            { id: `arch-${card.id}`, originalUid: card.ownerUid, gameId, reason: "dead", archivedAt: Date.now(), card },
            ...s.archive,
          ],
        }));
        return true;
      }
      return (
        (await run(async () => {
          await archiveCharacter(card, "dead", gameId);
          // A dead hunter drops their gear as claimable loot.
          if (gameId) {
            await createLoot(gameId, {
              fromUid: card.ownerUid,
              fromName: card.name,
              items: card.inventory ?? [],
              coins: card.coins ?? 0,
            });
          }
        }, "Couldn't archive the character.")) !== null
      );
    },

    revive: async (id) => {
      if (get().preview) {
        set((s) => ({ party: s.party.map((c) => (c.id === id ? { ...c, deathPending: false } : c)) }));
        return true;
      }
      return (await run(() => patchCharacter(id, { deathPending: false }), "Couldn't revive the character.")) !== null;
    },

    recover: async (a) => {
      if (get().preview) {
        set((s) => ({
          archive: s.archive.filter((x) => x.id !== a.id),
          party: [...s.party, { ...a.card, deathPending: false }],
        }));
        return true;
      }
      return (await run(() => recoverCharacter(a), "Couldn't recover the character.")) !== null;
    },

    awardInsight: async (id, delta) => {
      if (get().preview) {
        set((s) => ({
          party: s.party.map((c) =>
            c.id === id ? { ...c, insight: Math.max(0, (c.insight ?? 0) + delta) } : c,
          ),
        }));
        return true;
      }
      return (await run(() => apiAwardInsight(id, delta), "Couldn't award Insight.")) !== null;
    },
  };
});
