import { useAuthStore } from "@/features/auth/store/authStore";
import type { AccessRole, PlayerType } from "@/types";

/**
 * Preview the app as a different role. Changes what the UI shows/gates; real
 * Firestore writes are still governed by your actual permissions.
 */
export function RoleSwitcher() {
  const identity = useAuthStore((s) => s.identity);
  const viewAs = useAuthStore((s) => s.viewAs);
  const setViewAs = useAuthStore((s) => s.setViewAs);

  const set = (patch: Partial<{ accessRole: AccessRole; playerType: PlayerType }>) =>
    setViewAs({ ...identity, ...patch });

  return (
    <div className="card">
      <p className="eyebrow">Preview · View as</p>
      <h3 style={{ marginBottom: 4 }}>Role switcher</h3>
      <p className="faint" style={{ fontSize: "0.84rem", marginTop: 0 }}>
        See how the app looks for each role. {viewAs ? "Previewing — not your real role." : ""}
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <select className="select" value={identity.accessRole} onChange={(e) => set({ accessRole: e.target.value as AccessRole })} aria-label="Preview access role">
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select className="select" value={identity.playerType} onChange={(e) => set({ playerType: e.target.value as PlayerType })} aria-label="Preview player type">
          <option value="player">Player</option>
          <option value="dm">Dungeon Master</option>
        </select>
      </div>
      {viewAs && (
        <button className="btn btn-ghost btn-sm" onClick={() => setViewAs(null)}>
          Reset to my role
        </button>
      )}
    </div>
  );
}
