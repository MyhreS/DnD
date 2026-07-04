import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Campaign } from "@/types";
import { useCampaignStore } from "../store/campaignStore";

/** DM-only: permanently delete a campaign (the active one by default, or the
 * given `campaign` — e.g. from the main-menu list) behind several explicit
 * confirmations — including typing the campaign's name. */
export function DeleteCampaign({ campaign }: { campaign?: Campaign }) {
  const navigate = useNavigate();
  const active = useCampaignStore((s) => s.active);
  const remove = useCampaignStore((s) => s.remove);
  const busy = useCampaignStore((s) => s.busy);
  const error = useCampaignStore((s) => s.error);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");
  const target = campaign ?? active;
  if (!target) return null;
  const nameMatches = typed.trim() === target.name.trim();

  async function onDelete() {
    if (!target) return;
    const ok = await remove(target.id);
    // Only navigate when deleting from inside the campaign chrome.
    if (ok && !campaign) navigate("/");
  }

  if (step === 0) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ color: "var(--blood-bright)", width: "auto" }}
        onClick={() => { setStep(1); setTyped(""); }}
      >
        Delete this campaign…
      </button>
    );
  }

  return (
    <div className="card" style={{ borderColor: "var(--blood-bright)" }}>
      <p className="eyebrow" style={{ marginBottom: 6, color: "var(--blood-bright)" }}>Danger zone</p>
      {error && <div className="banner banner-error" style={{ marginBottom: 10 }}>{error}</div>}
      {step === 1 ? (
        <>
          <p style={{ marginBottom: 10 }}>
            Permanently delete <strong>{target.name}</strong>? This removes its games, sessions,
            trades, shop and any seeded bots — for everyone. Players' own hunters are kept (just
            un-bound from this campaign). This <strong>cannot be undone</strong>.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)} disabled={busy}>Keep campaign</button>
            <button type="button" className="btn btn-ghost" style={{ color: "var(--blood-bright)" }} onClick={() => setStep(2)} disabled={busy}>
              Continue…
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ marginBottom: 8 }}>
            Final check — type the campaign name <strong>{target.name}</strong> to confirm.
          </p>
          <div className="field">
            <input
              className="input"
              value={typed}
              placeholder={target.name}
              onChange={(e) => setTyped(e.target.value)}
              aria-label="Type the campaign name to confirm deletion"
            />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)} disabled={busy}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: "var(--blood)" }}
              disabled={!nameMatches || busy}
              onClick={onDelete}
            >
              {busy ? (<><span className="btn-spinner" aria-hidden /> Deleting…</>) : "Delete forever"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
