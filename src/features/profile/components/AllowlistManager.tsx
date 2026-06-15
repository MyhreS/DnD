import { useState } from "react";
import { displayName } from "@/config";
import { sendInvite } from "@/api/notifications";
import { useAllowlist } from "../hooks/useAllowlist";
import type { AccessRole, PlayerType } from "@/types";

export function AllowlistManager({ adminEmail }: { adminEmail: string }) {
  const { members, error: loadError, add, remove } = useAllowlist(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accessRole, setAccessRole] = useState<AccessRole>("user");
  const [playerType, setPlayerType] = useState<PlayerType>("player");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<string | null>(null);

  async function invite(target: string) {
    setInvited(null);
    setError(null);
    try {
      await sendInvite(target);
      setInvited(`Invite sent to ${target}.`);
    } catch (err) {
      console.error(err);
      setError("Could not send invite — is email configured?");
    }
  }

  const canAdd =
    firstName.trim() && lastName.trim() && email.trim().includes("@") && !busy;

  async function submit() {
    if (!canAdd) {
      setError("First name, last name and a valid email are all required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await add(
        { email: email.trim(), firstName, lastName, accessRole, playerType },
        adminEmail,
      );
      setFirstName("");
      setLastName("");
      setEmail("");
      setAccessRole("user");
      setPlayerType("player");
    } catch (err) {
      console.error(err);
      setError("Could not add that member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Admin · Party access</p>
      <h3 style={{ marginBottom: 4 }}>Members</h3>
      <p className="faint" style={{ fontSize: "0.84rem", marginTop: 0 }}>
        Add someone with their name — they'll get an email invite to the app.
      </p>

      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input className="input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <input className="input" type="email" inputMode="email" autoCapitalize="none" placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <select className="select" value={accessRole} onChange={(e) => setAccessRole(e.target.value as AccessRole)} aria-label="Access role">
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select className="select" value={playerType} onChange={(e) => setPlayerType(e.target.value as PlayerType)} aria-label="Player type">
          <option value="player">Player</option>
          <option value="dm">Dungeon Master</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ flex: "none" }} disabled={!canAdd} onClick={() => void submit()}>Add</button>
      </div>

      {(error || loadError) && <div className="banner banner-error" style={{ marginBottom: 12 }}>{error ?? loadError}</div>}
      {invited && <div className="banner banner-ok" style={{ marginBottom: 12 }}>{invited}</div>}

      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => void invite(adminEmail)}>
        Send myself a test invite
      </button>

      {members === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul className="list-reset pill-list">
          {members.map((m) => (
            <li key={m.email} className="row between" style={{ gap: 8, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>{displayName(m, members)}</span>
                  {m.playerType === "dm" && <span className="role-tag">DM</span>}
                  {m.accessRole !== "user" && <span className="role-tag">{m.accessRole}</span>}
                </div>
                <div className="faint" style={{ fontSize: "0.78rem", overflowWrap: "anywhere" }}>{m.email}</div>
              </div>
              <div className="row" style={{ gap: 6, flex: "none" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => void invite(m.email)}>Invite</button>
                {m.email !== adminEmail.toLowerCase() && (
                  <button className="btn btn-ghost btn-sm" onClick={() => void remove(m.email)}>Remove</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
