import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil } from "@/components/icons";

export function DeniedPage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <div className="splash">
      <div className="fade-in stack" style={{ alignItems: "center", maxWidth: 360 }}>
        <Sigil width={72} height={72} />
        <h1 style={{ marginTop: 8 }}>Not on the roster</h1>
        <p className="muted center">
          You're signed in as <span className="gold">{user?.email}</span>, but this
          account isn't on the hunting party's allowlist yet.
        </p>
        <p className="muted center" style={{ marginBottom: 22 }}>
          Ask Simon to add this email, then sign in again.
        </p>
        <button className="btn btn-ghost" style={{ maxWidth: 240 }} onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
