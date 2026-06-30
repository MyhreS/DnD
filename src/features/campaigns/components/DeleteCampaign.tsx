import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaignStore } from "../store/campaignStore";

/** DM-only: permanently delete the active campaign (test or real) behind several
 * explicit confirmations — including typing the campaign's name. */
export function DeleteCampaign() {
  const navigate = useNavigate();
  const active = useCampaignStore((s) => s.active);
  const remove = useCampaignStore((s) => s.remove);
  const busy = useCampaignStore((s) => s.busy);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");
  if (!active) return null;
  const nameMatches = typed.trim() === active.name.trim();

  async function onDelete() {
    if (!active) return;
    const ok = await remove(active.id);
    if (ok) navigate("/");
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
      {step === 1 ? (
        <>
          <p style={{ marginBottom: 10 }}>
            Permanently delete <strong>{active.name}</strong>? This removes its games, sessions,
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
            Final check — type the campaign name <strong>{active.name}</strong> to confirm.
          </p>
          <div className="field">
            <input
              className="input"
              value={typed}
              placeholder={active.name}
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
