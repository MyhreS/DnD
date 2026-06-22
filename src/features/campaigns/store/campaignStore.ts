import { create } from "zustand";
import type { Campaign, CampaignMember } from "@/types";
import {
  subscribeMyCampaigns,
  subscribeCampaign,
  subscribeMembers,
  createCampaign,
  joinCampaign,
  leaveCampaign,
  setMemberCharacter,
  type CreateCampaignInput,
  type JoinCampaignInput,
} from "@/api/campaigns";
import { isPreviewActive, previewCampaign, previewMembers } from "@/dev/preview";

const ACTIVE_KEY = "cs-active-campaign";

type Status = "idle" | "loading" | "loaded" | "error";

interface CampaignState {
  campaigns: Campaign[];
  activeId: string | null;
  active: Campaign | null;
  members: CampaignMember[];
  status: Status;
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsubMine: (() => void) | null;
  _unsubActive: (() => void) | null;
  _unsubMembers: (() => void) | null;

  init: (uid: string) => void;
  stop: () => void;
  enter: (id: string) => void;
  exit: () => void;
  create: (input: CreateCampaignInput) => Promise<string | null>;
  join: (input: JoinCampaignInput) => Promise<string | null>;
  leave: (id: string, uid: string) => Promise<boolean>;
  pickCharacter: (uid: string, characterId: string | null) => Promise<boolean>;
}

export const useCampaignStore = create<CampaignState>((set, get) => {
  function watchActive(id: string | null) {
    get()._unsubActive?.();
    get()._unsubMembers?.();
    if (!id) {
      set({ _unsubActive: null, _unsubMembers: null, active: null, members: [] });
      return;
    }
    const ua = subscribeCampaign(id, (active) => set({ active }));
    const um = subscribeMembers(id, (members) => set({ members }));
    set({ _unsubActive: ua, _unsubMembers: um });
  }

  async function run<T>(fn: () => Promise<T>, msg: string): Promise<T | null> {
    set({ busy: true, error: null });
    try {
      const out = await fn();
      set({ busy: false });
      return out;
    } catch (err) {
      console.error(msg, err);
      set({ busy: false, error: err instanceof Error ? err.message : msg });
      return null;
    }
  }

  return {
    campaigns: [],
    activeId: null,
    active: null,
    members: [],
    status: "idle",
    busy: false,
    error: null,
    preview: false,
    _unsubMine: null,
    _unsubActive: null,
    _unsubMembers: null,

    init: (uid) => {
      if (isPreviewActive()) {
        const c = previewCampaign();
        set({ preview: true, campaigns: [c], activeId: c.id, active: c, members: previewMembers(), status: "loaded" });
        return;
      }
      if (get()._unsubMine) return;
      set({ status: "loading" });
      const stored = localStorage.getItem(ACTIVE_KEY);
      const unsub = subscribeMyCampaigns(
        uid,
        (campaigns) => {
          const activeId = campaigns.some((c) => c.id === stored) ? stored : get().activeId;
          set({ campaigns, status: "loaded" });
          if (activeId && activeId !== get().activeId) {
            set({ activeId });
            watchActive(activeId);
          } else if (!campaigns.some((c) => c.id === get().activeId)) {
            // active campaign no longer ours
            if (get().activeId && !get().active) watchActive(get().activeId);
          }
        },
        () => set({ status: "error", error: "Couldn't load your campaigns." }),
      );
      set({ _unsubMine: unsub });
    },

    stop: () => {
      get()._unsubMine?.();
      get()._unsubActive?.();
      get()._unsubMembers?.();
      set({ _unsubMine: null, _unsubActive: null, _unsubMembers: null });
    },

    enter: (id) => {
      localStorage.setItem(ACTIVE_KEY, id);
      set({ activeId: id });
      if (!get().preview) watchActive(id);
    },

    exit: () => {
      localStorage.removeItem(ACTIVE_KEY);
      if (!get().preview) watchActive(null);
      set({ activeId: null });
    },

    create: async (input) => {
      if (get().preview) return previewCampaign().id;
      const id = await run(() => createCampaign(input), "Couldn't create the campaign.");
      if (id) get().enter(id);
      return id;
    },

    join: async (input) => {
      if (get().preview) return previewCampaign().id;
      const id = await run(() => joinCampaign(input), "Couldn't join — check the code.");
      if (id) get().enter(id);
      return id;
    },

    leave: async (id, uid) => {
      if (get().preview) return true;
      const ok = (await run(() => leaveCampaign(id, uid), "Couldn't leave.")) !== null;
      if (ok && get().activeId === id) get().exit();
      return ok;
    },

    pickCharacter: async (uid, characterId) => {
      if (get().preview) return true;
      const id = get().activeId;
      if (!id) return false;
      return (await run(() => setMemberCharacter(id, uid, characterId), "Couldn't set your character.")) !== null;
    },
  };
});
