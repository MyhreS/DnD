import { useState } from "react";
import type { Campaign } from "@/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "../store/campaignStore";

/** Player-only: leave a campaign behind an explicit confirmation. Your hunter
 * is kept (just un-bound); you can rejoin any time with an invite code. */
export function LeaveCampaign({ campaign }: { campaign: Campaign }) {
  const user = useAuthStore((s) => s.user);
  const leave = useCampaignStore((s) => s.leave);
  const busy = useCampaignStore((s) => s.busy);
  const [confirming, setConfirming] = useState(false);
  if (!user) return null;

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ color: "var(--blood-bright)", width: "auto" }}
        onClick={() => setConfirming(true)}
      >
        Leave campaign…
      </button>
    );
  }

  return (
    <div className="card" style={{ borderColor: "var(--blood-bright)" }}>
      <p style={{ marginBottom: 10 }}>
        Leave <strong>{campaign.name}</strong>? Your hunter is kept (just un-bound from this
        campaign), and you can rejoin any time with an invite code.
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Stay</button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ background: "var(--blood)" }}
          disabled={busy}
          onClick={() => void leave(campaign.id, user.uid)}
        >
          {busy ? (<><span className="btn-spinner" aria-hidden /> Leaving…</>) : "Leave campaign"}
        </button>
      </div>
    </div>
  );
}
