import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fullName } from "@/config";
import { format } from "date-fns";
import { SignOutIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileNameForm } from "./ProfileNameForm";
import { CharacterViewSetting } from "./CharacterViewSetting";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const name = member ? fullName(member) : (user?.displayName ?? "Hunter");
  return (
    <div className="reading">
      <p className="eyebrow">Profile</p>
      <h1 className="page-title">{name}</h1>
      <p className="page-intro">
        {user?.email}
      </p>

      <ProfileNameForm />

      <ThemeToggle />

      <CharacterViewSetting />

      <div className="card">
        <p className="eyebrow">App</p>
        <div className="row between" style={{ marginBottom: 0 }}>
          <span className="faint" style={{ fontSize: "0.84rem" }}>
            This build: {format(new Date(__APP_BUILD__), "d MMM HH:mm")}
          </span>
        </div>
        <p className="faint" style={{ fontSize: "0.76rem", marginTop: 8, marginBottom: 0 }}>
          When a new version is ready, a flashing “update” banner appears at the
          top — tap it to switch.
        </p>
      </div>

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
