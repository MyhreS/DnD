import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "@/features/hunter/hooks/useHunterCard";
import { AsyncButton } from "@/components/AsyncButton";
import { Sigil } from "@/components/icons";
import { useCampaignStore } from "../store/campaignStore";
import type { Campaign } from "@/types";

/** The "main menu" home: your campaigns, your hunters, and the handbook. */
export function MainMenu() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const enter = useCampaignStore((s) => s.enter);
  const characters = usePlayerStore((s) => s.characters);
  const navigate = useNavigate();
  useHunterCard();

  function go(c: Campaign) {
    enter(c.id);
    navigate("/sessions");
  }

  return (
    <div className="reading">
      <div className="center" style={{ paddingTop: 6 }}>
        <Sigil width={56} height={56} />
        <p className="eyebrow" style={{ marginTop: 8 }}>Catacombs &amp; Starspawns</p>
        <h1 className="page-title" style={{ marginBottom: 2 }}>
          Welcome{member?.firstName ? `, ${member.firstName}` : ""}
        </h1>
        <p className="muted">Join a campaign or start your own, then bring a hunter to the table.</p>
      </div>

      <p className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Your campaigns</p>
      {campaigns.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>No campaigns yet — create one or join with a code below.</p></div>
      ) : (
        <div className="card-grid">
          {campaigns.map((c) => (
            <button key={c.id} type="button" className="card card-hover" style={{ textAlign: "left" }} onClick={() => go(c)}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.05rem" }}>{c.name}</div>
              <div className="faint" style={{ fontSize: "0.82rem", marginTop: 2 }}>
                DM {c.dmName} · {c.memberUids.length} {c.memberUids.length === 1 ? "member" : "members"}
                {c.dmUid === user?.uid ? " · you're DM" : ""}
              </div>
              <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>Enter →</div>
            </button>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <CreateCampaign />
        <JoinCampaign />
      </div>

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Your hunters</p>
      <div className="card">
        {characters.length === 0 ? (
          <p className="muted" style={{ marginTop: 0 }}>No hunters yet. Forge one to play.</p>
        ) : (
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {characters.map((c) => (
              <span key={c.id} className="chip">{c.name || "Unnamed"}</span>
            ))}
          </div>
        )}
        <Link className="btn btn-ghost" to="/character">Manage hunters</Link>
      </div>

      <div className="rule-ornament">◆</div>
      <Link className="btn btn-ghost" to="/handbook">Read the handbook</Link>
    </div>
  );
}

function CreateCampaign() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const create = useCampaignStore((s) => s.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return <button className="btn btn-primary" style={{ flex: 1, minWidth: 150 }} onClick={() => setOpen(true)}>Create campaign</button>;
  }
  return (
    <div className="card" style={{ width: "100%" }}>
      <div className="field">
        <label htmlFor="camp-name">Campaign name</label>
        <input id="camp-name" className="input" value={name} maxLength={50} placeholder="e.g. The Sunless Vault" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <AsyncButton
          className="btn btn-primary"
          pendingText="Creating…"
          showDone={false}
          disabled={!name.trim() || !user}
          onClick={async () => {
            if (!user || !name.trim()) return;
            await create({ name: name.trim(), dmUid: user.uid, dmName: member?.firstName || user.displayName || "DM", dmEmail: user.email ?? "" });
          }}
        >
          Create &amp; enter
        </AsyncButton>
      </div>
    </div>
  );
}

function JoinCampaign() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const join = useCampaignStore((s) => s.join);
  const error = useCampaignStore((s) => s.error);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  if (!open) {
    return <button className="btn btn-ghost" style={{ flex: 1, minWidth: 150 }} onClick={() => setOpen(true)}>Join with a code</button>;
  }
  return (
    <div className="card" style={{ width: "100%" }}>
      <div className="field">
        <label htmlFor="camp-code">Invite code</label>
        <input id="camp-code" className="input" value={code} maxLength={8} placeholder="e.g. VAULT7" style={{ textTransform: "uppercase" }} onChange={(e) => setCode(e.target.value)} />
      </div>
      {error && <div className="banner banner-error" style={{ marginBottom: 10 }}>{error}</div>}
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <AsyncButton
          className="btn btn-primary"
          pendingText="Joining…"
          showDone={false}
          disabled={!code.trim() || !user}
          onClick={async () => {
            if (!user || !code.trim()) return;
            await join({ code: code.trim(), uid: user.uid, name: member?.firstName || user.displayName || "Hunter", email: user.email ?? "" });
          }}
        >
          Join
        </AsyncButton>
      </div>
    </div>
  );
}
