import { useState } from "react";
import { useCampaignStore } from "../store/campaignStore";
import { AsyncButton } from "@/components/AsyncButton";

/** DM tool: share/regenerate the join code, and invite players by email. */
export function CampaignInvitePanel() {
  const active = useCampaignStore((s) => s.active);
  const invite = useCampaignStore((s) => s.invite);
  const uninvite = useCampaignStore((s) => s.uninvite);
  const regenerateCode = useCampaignStore((s) => s.regenerateCode);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  if (!active) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(active!.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the code is shown anyway */
    }
  }
  async function add() {
    if (!email.trim()) return;
    if (await invite(email)) setEmail("");
  }

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginTop: 0 }}>Invite players</p>

      <div className="field">
        <label>Share code</label>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <code className="invite-code">{active.inviteCode}</code>
          <button className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <AsyncButton className="btn-ghost btn-sm" pendingText="…" showDone={false} onClick={() => regenerateCode()}>
            Regenerate
          </AsyncButton>
        </div>
        <div className="faint" style={{ fontSize: "0.78rem", marginTop: 4 }}>
          Players enter this on the main menu (“Join with a code”), or invite them by email below.
        </div>
      </div>

      <div className="field">
        <label htmlFor="invite-email">Invite by email</label>
        <div className="row" style={{ gap: 8 }}>
          <input
            id="invite-email"
            className="input"
            type="email"
            placeholder="player@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <AsyncButton
            className="btn-primary btn-sm"
            style={{ width: "auto", flex: "none" }}
            pendingText="…"
            showDone={false}
            disabled={!email.trim()}
            onClick={add}
          >
            Invite
          </AsyncButton>
        </div>
      </div>

      {active.invitedEmails.length > 0 && (
        <ul className="list-reset" style={{ marginTop: 6 }}>
          {active.invitedEmails.map((e) => (
            <li key={e} className="row between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="faint" style={{ fontSize: "0.84rem", wordBreak: "break-all" }}>{e} · invited</span>
              <button className="btn btn-ghost btn-sm" style={{ width: "auto", flex: "none" }} onClick={() => uninvite(e)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
