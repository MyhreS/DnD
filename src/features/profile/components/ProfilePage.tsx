import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fullName } from "@/config";
import { isPreviewActive } from "@/dev/preview";
import { SignOutIcon } from "@/components/icons";
import { RoleSwitcher } from "./RoleSwitcher";
import { AllowlistManager } from "./AllowlistManager";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const identity = useAuthStore((s) => s.identity);
  const canManageMembers = useAuthStore((s) => s.caps.manageMembers);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const name = member ? fullName(member) : (user?.displayName ?? "Hunter");
  const showSwitcher = canManageMembers || isPreviewActive();

  return (
    <div>
      <p className="eyebrow">Profile</p>
      <h1 className="page-title">{name}</h1>
      <p className="page-intro">
        {user?.email}
        <span className="faint"> · {identity.accessRole}{identity.playerType === "dm" ? " · DM" : ""}</span>
      </p>

      {showSwitcher && <RoleSwitcher />}
      {canManageMembers && <AllowlistManager adminEmail={user?.email ?? ""} />}

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
