import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil, GoogleIcon } from "@/components/icons";
import { APP_NAME } from "@/config";

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const signingIn = useAuthStore((s) => s.signingIn);
  const error = useAuthStore((s) => s.error);

  return (
    <div className="splash">
      <div className="fade-in stack" style={{ alignItems: "center", maxWidth: 360 }}>
        <Sigil width={84} height={84} />
        <p className="eyebrow" style={{ marginTop: 8 }}>Player's Companion</p>
        <h1 style={{ fontSize: "2rem", marginBottom: 4 }}>{APP_NAME}</h1>
        <p className="muted center" style={{ marginBottom: 24 }}>
          Track the next hunt, forge your hunter, and study the handbook.
          A private app for our table.
        </p>

        {error && (
          <div className="banner banner-error full" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-google"
          onClick={() => void signIn()}
          disabled={signingIn}
        >
          <GoogleIcon />
          {signingIn ? "Signing in…" : "Continue with Google"}
        </button>

        <p className="faint center" style={{ fontSize: "0.82rem", marginTop: 18 }}>
          Access is limited to invited hunters. Sign in with the Google account
          that was added to the party.
        </p>
      </div>
    </div>
  );
}
