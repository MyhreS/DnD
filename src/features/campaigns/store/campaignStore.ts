import { create } from "zustand";
import type { Campaign, CampaignMember } from "@/types";
import {
  subscribeMyCampaigns,
  subscribeInvitedCampaigns,
  subscribeCampaign,
  subscribeMembers,
  createCampaign,
  createTestCampaign,
  joinCampaign,
  leaveCampaign,
  deleteCampaign,
  setMemberCharacter,
  inviteByEmail,
  uninviteEmail,
  regenerateInviteCode,
  acceptInvite,
  declineInvite,
  type CreateCampaignInput,
  type JoinCampaignInput,
} from "@/api/campaigns";
import { isPreviewActive, previewCampaign, previewMembers } from "@/dev/preview";
import { useAuthStore } from "@/features/auth/store/authStore";

const ACTIVE_KEY = "cs-active-campaign";

type Status = "idle" | "loading" | "loaded" | "error";

interface CampaignState {
  campaigns: Campaign[];
  /** Campaigns you've been invited to by email (not yet joined). */
  invited: Campaign[];
  activeId: string | null;
  active: Campaign | null;
  members: CampaignMember[];
  status: Status;
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsubMine: (() => void) | null;
  _unsubInvited: (() => void) | null;
  _unsubActive: (() => void) | null;
  _unsubMembers: (() => void) | null;

  init: (uid: string) => void;
  stop: () => void;
  enter: (id: string) => void;
  exit: () => void;
  create: (input: CreateCampaignInput) => Promise<string | null>;
  /** Create a real "Test Run" campaign seeded with the DM + 5 bot hunters. */
  createTest: () => Promise<string | null>;
  join: (input: JoinCampaignInput) => Promise<string | null>;
  leave: (id: string, uid: string) => Promise<boolean>;
  /** DM: permanently delete a campaign (+ its scoped data) and exit it. */
  remove: (id: string) => Promise<boolean>;
  pickCharacter: (uid: string, characterId: string | null) => Promise<boolean>;
  /** DM: invite/uninvite by email, regenerate the share code. */
  invite: (email: string) => Promise<boolean>;
  uninvite: (email: string) => Promise<boolean>;
  regenerateCode: () => Promise<string | null>;
  /** Player: accept / decline an email invite. */
  accept: (campaign: Campaign) => Promise<string | null>;
  decline: (campaign: Campaign) => Promise<boolean>;
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
    invited: [],
    activeId: null,
    active: null,
    members: [],
    status: "idle",
    busy: false,
    error: null,
    preview: false,
    _unsubMine: null,
    _unsubInvited: null,
    _unsubActive: null,
    _unsubMembers: null,

    init: (uid) => {
      if (isPreviewActive()) {
        const isDm = useAuthStore.getState().identity.playerType === "dm";
        let c = previewCampaign();
        let members = previewMembers();
        if (isDm) {
          // Make the preview user this campaign's DM so DM controls show.
          c = { ...c, dmUid: "preview-uid", dmName: "You (DM)" };
          members = [{ ...members[0], uid: "preview-uid", name: "You (DM)" }, ...members.slice(1)];
        }
        set({ preview: true, campaigns: [c], invited: [], activeId: c.id, active: c, members, status: "loaded" });
        return;
      }
      if (get()._unsubMine) return;
      set({ status: "loading" });
      // Subscribe to campaigns you've been invited to (by email).
      const email = useAuthStore.getState().user?.email;
      if (email) {
        const ui = subscribeInvitedCampaigns(email, (invited) => set({ invited }));
        set({ _unsubInvited: ui });
      }
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
      get()._unsubInvited?.();
      get()._unsubActive?.();
      get()._unsubMembers?.();
      set({ _unsubMine: null, _unsubInvited: null, _unsubActive: null, _unsubMembers: null });
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

    createTest: async () => {
      if (get().preview) return previewCampaign().id;
      const { user, member } = useAuthStore.getState();
      if (!user) return null;
      const name = member?.firstName
        ? [member.firstName, member.lastName].filter(Boolean).join(" ")
        : (user.displayName ?? "DM");
      const id = await run(
        () => createTestCampaign({ uid: user.uid, name, email: user.email ?? "" }),
        "Couldn't create the test campaign.",
      );
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

    remove: async (id) => {
      if (get().preview) { get().exit(); return true; }
      const ok = (await run(() => deleteCampaign(id), "Couldn't delete the campaign.")) !== null;
      if (ok && get().activeId === id) get().exit();
      return ok;
    },

    pickCharacter: async (uid, characterId) => {
      if (get().preview) return true;
      const id = get().activeId;
      if (!id) return false;
      return (await run(() => setMemberCharacter(id, uid, characterId), "Couldn't set your character.")) !== null;
    },

    invite: async (email) => {
      if (get().preview) return true;
      const id = get().activeId;
      if (!id || !email.trim()) return false;
      return (await run(() => inviteByEmail(id, email), "Couldn't send the invite.")) !== null;
    },

    uninvite: async (email) => {
      if (get().preview) return true;
      const id = get().activeId;
      if (!id) return false;
      return (await run(() => uninviteEmail(id, email), "Couldn't remove the invite.")) !== null;
    },

    regenerateCode: async () => {
      if (get().preview) return previewCampaign().inviteCode;
      const id = get().activeId;
      if (!id) return null;
      return run(() => regenerateInviteCode(id), "Couldn't regenerate the code.");
    },

    accept: async (campaign) => {
      if (get().preview) return campaign.id;
      const { user, member } = useAuthStore.getState();
      if (!user?.email) return null;
      const name = member?.firstName || user.displayName || "Hunter";
      const ok = await run(
        () => acceptInvite({ campaignId: campaign.id, uid: user.uid, name, email: user.email! }),
        "Couldn't accept the invite.",
      );
      if (ok !== null) {
        get().enter(campaign.id);
        return campaign.id;
      }
      return null;
    },

    decline: async (campaign) => {
      if (get().preview) return true;
      const email = useAuthStore.getState().user?.email;
      if (!email) return false;
      return (await run(() => declineInvite(campaign.id, email), "Couldn't decline.")) !== null;
    },
  };
});
