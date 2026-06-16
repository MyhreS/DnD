import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil } from "./icons";

export function Layout() {
  const member = useAuthStore((s) => s.member);
  const user = useAuthStore((s) => s.user);
  // Players build a hunter; the DM doesn't, so they don't get the Character tab.
  const showCharacter = useAuthStore((s) => s.identity.playerType === "player");
  const location = useLocation();

  const firstName = member?.firstName || user?.displayName || user?.email || "Hunter";
  const initial = firstName.trim().charAt(0).toUpperCase() || "H";

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="Home">
          <Sigil className="brand-mark" />
          <span className="brand-title">Catacombs &amp; Starspawns</span>
        </Link>
        <Link to="/profile" aria-label="Your profile" className="avatar">
          {initial}
        </Link>
      </header>

      <nav className="top-tabs" aria-label="Primary">
        <NavLink to="/" end>Sessions</NavLink>
        {showCharacter && <NavLink to="/character">Character</NavLink>}
        <NavLink to="/party">Party</NavLink>
        <NavLink to="/handbook">Handbook</NavLink>
      </nav>

      <main className="app-main">
        <div className="fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
