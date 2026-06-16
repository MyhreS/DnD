import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fullName, capabilities } from "@/config";
import { isPreviewActive } from "@/dev/preview";
import { format } from "date-fns";
import { SignOutIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FightersToggle } from "./FightersToggle";
import { AsyncButton } from "@/components/AsyncButton";
import { hardRefresh } from "@/app/pwaUpdates";
import { RoleSwitcher } from "./RoleSwitcher";
import { AllowlistManager } from "./AllowlistManager";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const identity = useAuthStore((s) => s.identity);
  const canManageMembers = useAuthStore((s) => s.caps.manageMembers);
  const realIdentity = useAuthStore((s) => s.realIdentity);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const name = member ? fullName(member) : (user?.displayName ?? "Hunter");
  // Gate on the REAL role so previewing as a lower role doesn't hide the
  // switcher (otherwise you'd be stuck and couldn't switch back).
  const showSwitcher = capabilities(realIdentity).oversight || isPreviewActive();

  return (
    <div>
      <p className="eyebrow">Profile</p>
      <h1 className="page-title">{name}</h1>
      <p className="page-intro">
        {user?.email}
        <span className="faint"> · {identity.accessRole}{identity.playerType === "dm" ? " · DM" : ""}</span>
      </p>

      <ThemeToggle />

      <FightersToggle />

      <div className="card">
        <p className="eyebrow">App</p>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="faint" style={{ fontSize: "0.84rem" }}>
            This build: {format(new Date(__APP_BUILD__), "d MMM HH:mm")}
          </span>
        </div>
        <AsyncButton className="btn-ghost" pendingText="Refreshing…" showDone={false} onClick={hardRefresh}>
          Get latest version
        </AsyncButton>
        <p className="faint" style={{ fontSize: "0.76rem", marginTop: 8, marginBottom: 0 }}>
          The app updates itself when you reopen it. Tap this if it ever looks out of date.
        </p>
      </div>

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
