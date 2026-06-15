import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { CalendarIcon, HunterIcon, BookIcon, UsersIcon, Sigil } from "./icons";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  // Players build a hunter; the DM doesn't, so they don't get the Hunter tab.
  const showHunter = useAuthStore((s) => s.identity.playerType === "player");
  const location = useLocation();

  const initials = (user?.displayName || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="Home">
          <Sigil className="brand-mark" />
          <span className="brand-title">Catacombs &amp; Starspawns</span>
        </Link>
        <Link
          to="/profile"
          aria-label="Your profile"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "var(--bg-elev-3)",
            border: "1px solid var(--border-strong)",
            color: "var(--gold)",
            fontFamily: "var(--font-display)",
            fontSize: "0.8rem",
            overflow: "hidden",
            flex: "none",
          }}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials || "H"
          )}
        </Link>
      </header>

      <main className="app-main">
        <div className="fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/" end>
          <CalendarIcon className="nav-icon" />
          <span>Sessions</span>
        </NavLink>
        {showHunter && (
          <NavLink to="/hunter">
            <HunterIcon className="nav-icon" />
            <span>Hunter</span>
          </NavLink>
        )}
        <NavLink to="/party">
          <UsersIcon className="nav-icon" />
          <span>Party</span>
        </NavLink>
        <NavLink to="/handbook">
          <BookIcon className="nav-icon" />
          <span>Handbook</span>
        </NavLink>
      </nav>
    </div>
  );
}
