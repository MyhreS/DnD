import { Link, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil, GoogleIcon } from "@/components/icons";

/** Shell for signed-out visitors: a slim bar (brand + sign in) over public
 * content (landing + handbook). Reuses the app shell so it's responsive. */
export function PublicLayout() {
  const signIn = useAuthStore((s) => s.signIn);
  const signingIn = useAuthStore((s) => s.signingIn);

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <header className="app-header">
          <Link to="/" className="brand" aria-label="Home">
            <Sigil className="brand-mark" />
            <span className="brand-title">Catacombs &amp; Starspawns</span>
          </Link>
          <button
            className="btn btn-google btn-sm"
            style={{ width: "auto" }}
            onClick={() => void signIn()}
            disabled={signingIn}
          >
            {signingIn ? <span className="btn-spinner" aria-hidden /> : <><GoogleIcon /> Sign in</>}
          </button>
        </header>
      </div>
      <main className="app-main">
        <div className="reading">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
