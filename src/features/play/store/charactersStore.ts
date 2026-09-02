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
import { clearFallenLoot, createLoot } from "@/api/games";
import { logEvent, describeLoot } from "@/api/activity";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { explain } from "@/lib/errors";
import { recoveredCard } from "@/lib/recovery";
import { isPreviewActive, previewPartyCards, previewArchive } from "@/dev/preview";
import type { ActivityType } from "@/types";

/** Chronicle a DM action on a hunter (fire-and-forget; bots stay quiet). */
function logHunter(card: HunterCard, type: ActivityType, message: string) {
  if (!card.campaignId || card.ownerUid.startsWith("bot-")) return;
  const { user, member } = useAuthStore.getState();
  if (!user) return;
  void logEvent({
    campaignId: card.campaignId,
    type,
    message,
    actorUid: user.uid,
    actorName: member?.firstName || user.displayName || "The DM",
    characterId: card.id,
    ownerUid: card.ownerUid,
  });
}

interface CharactersState {
  party: HunterCard[];
  archive: ArchivedCharacter[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsubParty: (() => void) | null;
  _unsubArchive: (() => void) | null;
  /** Mount count — multiple components share one subscription. */
  _refs: number;

  sync: () => void;
  stop: () => void;

  /** DM: confirm a pending death, or force-mark a character dead (override). */
  killCharacter: (card: HunterCard, gameId: string | null) => Promise<boolean>;
  /** DM: recover an archived character back into play. */
  recover: (a: ArchivedCharacter) => Promise<boolean>;
  /** DM: award (or subtract) Insight atomically — never loses rapid taps. The
   * award path goes through the api, never the owner's playerStore, so the DM
   * editing someone else's hunter doesn't clobber their own selected card. */
  awardInsight: (id: string, delta: number) => Promise<boolean>;
  /** DM: write any field(s) on any character (vitals, items, coins). Goes
   * through patchCharacter (partial merge) — never the owner's playerStore. */
  dmPatch: (id: string, partial: Partial<HunterCard>) => Promise<boolean>;
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
      set({ busy: false, error: explain(msg, err) });
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
    _refs: 0,

    sync: () => {
      set((s) => ({ _refs: s._refs + 1 }));
      if (get()._unsubParty || get().preview) return;
      if (isPreviewActive()) {
        set({ preview: true, party: previewPartyCards(), archive: previewArchive() });
        return;
      }
      // Scope the play + DM control board to the active campaign's hunters, so
      // the subscription streams this campaign's cards — not every hunter in
      // the app. Falls back to the global corpus if no campaign is active.
      const campaignId = useCampaignStore.getState().activeId;
      const unsubParty = subscribeAllCharacters(
        (party) => set({ party, error: null }), // a fresh snapshot clears any stale error
        (err) => set({ error: explain("Couldn't load characters", err) }),
        campaignId,
      );
      const unsubArchive = subscribeArchive((archive) => set({ archive }));
      set({ _unsubParty: unsubParty, _unsubArchive: unsubArchive });
    },

    // Ref-counted: only tear down the shared subscription when the last
    // consumer (DM board, combat tracker, …) unmounts.
    stop: () => {
      const refs = Math.max(0, get()._refs - 1);
      set({ _refs: refs });
      if (refs > 0) return;
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
      const ok =
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
        }, "Couldn't archive the character.")) !== null;
      if (ok) logHunter(card, "hunter.died", `${card.name} fell — the DM confirmed their death.`);
      return ok;
    },

    recover: async (a) => {
      if (get().preview) {
        set((s) => ({
          archive: s.archive.filter((x) => x.id !== a.id),
          party: [...s.party, recoveredCard(a.card)],
        }));
        return true;
      }
      const ok = (await run(async () => {
        await recoverCharacter(a);
        // Their gear returns with them, so it must leave the loot feed.
        if (a.gameId) await clearFallenLoot(a.gameId, a.card.ownerUid);
      }, "Couldn't recover the character.")) !== null;
      if (ok) logHunter(a.card, "hunter.recovered", `${a.card.name} was recovered from the fallen.`);
      return ok;
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
      const ok = (await run(() => apiAwardInsight(id, delta), "Couldn't award Insight.")) !== null;
      const card = get().party.find((c) => c.id === id);
      if (ok && card) {
        logHunter(
          card,
          "insight.awarded",
          delta >= 0
            ? `${card.name} was awarded ${delta} Insight.`
            : `${card.name} lost ${-delta} Insight.`,
        );
      }
      return ok;
    },

    dmPatch: async (id, partial) => {
      if (get().preview) {
        set((s) => ({ party: s.party.map((c) => (c.id === id ? { ...c, ...partial } : c)) }));
        return true;
      }
      const before = get().party.find((c) => c.id === id);
      const ok = (await run(() => patchCharacter(id, partial), "Couldn't update the character.")) !== null;
      // Chronicle the grants players care about (level, items, gold) — vitals
      // fiddling (HP/sanity/transformation) would drown the log.
      if (ok && before) {
        if (partial.level != null && partial.level !== before.level) {
          logHunter(before, "hunter.leveled", `${before.name} reached level ${partial.level}.`);
        }
        if (partial.inventory) {
          const prev = new Map((before.inventory ?? []).map((e) => [e.itemId, e.qty]));
          const next = new Map(partial.inventory.map((e) => [e.itemId, e.qty]));
          const gained = [...next].filter(([itemId, qty]) => qty > (prev.get(itemId) ?? 0))
            .map(([itemId, qty]) => ({ itemId, qty: qty - (prev.get(itemId) ?? 0) }));
          const lost = [...prev].filter(([itemId, qty]) => qty > (next.get(itemId) ?? 0))
            .map(([itemId, qty]) => ({ itemId, qty: qty - (next.get(itemId) ?? 0) }));
          if (gained.length > 0) {
            logHunter(before, "item.given", `${before.name} received ${describeLoot(gained, 0)} from the DM.`);
          }
          if (lost.length > 0) {
            logHunter(before, "item.given", `The DM took ${describeLoot(lost, 0)} from ${before.name}.`);
          }
        }
        if (partial.coins != null && partial.coins !== (before.coins ?? 0)) {
          logHunter(before, "gold.changed", `${before.name}'s gold: ${before.coins ?? 0} → ${partial.coins} gp (DM).`);
        }
      }
      return ok;
    },
  };
});
