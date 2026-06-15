import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { listAllowlist, addToAllowlist, removeFromAllowlist } from "@/lib/allowlist";
import { SignOutIcon } from "@/components/icons";
import type { AllowlistMember, MemberRole } from "@/types";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  return (
    <div>
      <p className="eyebrow">Profile</p>
      <h1 className="page-title">{user?.displayName ?? "Hunter"}</h1>
      <p className="page-intro">{user?.email}</p>

      {isAdmin && <AllowlistManager adminEmail={user?.email ?? ""} />}

      <button
        className="btn btn-ghost"
        style={{ marginTop: 18 }}
        onClick={async () => {
          await signOut();
          navigate("/");
        }}
      >
        <SignOutIcon width={18} height={18} /> Sign out
      </button>

      <p className="faint center" style={{ fontSize: "0.78rem", marginTop: 24 }}>
        Catacombs &amp; Starspawns — a private companion for our table.
      </p>
    </div>
  );
}

function AllowlistManager({ adminEmail }: { adminEmail: string }) {
  const [entries, setEntries] = useState<AllowlistMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("player");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setEntries(await listAllowlist());
    } catch (err) {
      console.error(err);
      setError("Could not load the allowlist.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function add() {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addToAllowlist(clean, adminEmail, role);
      setEmail("");
      setRole("player");
      await refresh();
    } catch (err) {
      console.error(err);
      setError("Could not add that email.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(target: string) {
    setBusy(true);
    setError(null);
    try {
      await removeFromAllowlist(target);
      await refresh();
    } catch (err) {
      console.error(err);
      setError("Could not remove that email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Admin · Party access</p>
      <h3 style={{ marginBottom: 4 }}>Allowlist</h3>
      <p className="faint" style={{ fontSize: "0.84rem", marginTop: 0 }}>
        Anyone you add here can sign in with that Google account.
      </p>

      <div className="field" style={{ marginBottom: 10 }}>
        <input
          className="input"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          placeholder="friend@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
        />
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <select
          className="select"
          value={role}
          onChange={(e) => setRole(e.target.value as MemberRole)}
          aria-label="Role"
        >
          <option value="player">Player</option>
          <option value="dm">Dungeon Master</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ flex: "none" }} disabled={busy} onClick={() => void add()}>
          Add
        </button>
      </div>

      {error && <div className="banner banner-error" style={{ marginBottom: 12 }}>{error}</div>}

      {entries === null ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No one added yet.</p>
      ) : (
        <ul className="list-reset pill-list">
          {entries.map((e) => (
            <li key={e.email} className="row between">
              <span className="row" style={{ gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: "0.92rem", wordBreak: "break-all" }}>{e.email}</span>
                {e.role !== "player" && <span className="role-tag">{e.role}</span>}
              </span>
              {e.email === adminEmail.toLowerCase() ? (
                <span className="chip" style={{ flex: "none" }}>you</span>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: "none" }}
                  disabled={busy}
                  onClick={() => void remove(e.email)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
