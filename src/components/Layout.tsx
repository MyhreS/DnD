import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { Sigil } from "./icons";
import { Fighters } from "./fighters/Fighters";
import { UpdateBar } from "./UpdateBar";
import { usePlaySync } from "@/features/play/hooks/usePlaySync";
import { LiveGameBanner } from "@/features/play/components/LiveGameBanner";

export function Layout() {
  const member = useAuthStore((s) => s.member);
  const user = useAuthStore((s) => s.user);
  const active = useCampaignStore((s) => s.active);
  const location = useLocation();

  // Keep the live-game subscription running app-wide (powers the banner + Play).
  usePlaySync();

  const firstName = member?.firstName || user?.displayName || user?.email || "Hunter";
  const initial = firstName.trim().charAt(0).toUpperCase() || "H";

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <header className="app-header">
          <Link to="/" className="brand" aria-label="Main menu">
            <Sigil className="brand-mark" />
            <span className="brand-title">{active ? active.name : "Catacombs & Starspawns"}</span>
          </Link>
          <Link to="/profile" aria-label="Your profile" className="avatar avatar-top">
            {initial}
          </Link>
        </header>

        <nav className="top-tabs" aria-label="Primary">
          <NavLink to="/" end>Menu</NavLink>
          {active && <NavLink to="/sessions">Sessions</NavLink>}
          {active && <NavLink to="/play">Play</NavLink>}
          {active && <NavLink to="/party">Party</NavLink>}
          <NavLink to="/character">Hunters</NavLink>
          <NavLink to="/handbook">Handbook</NavLink>
        </nav>

        <div className="sidebar-foot">
          <LiveGameBanner />
          <UpdateBar />
          {/* Desktop: profile sits at the bottom of the sidebar (top-right on mobile). */}
          <Link to="/profile" className="sidebar-profile" aria-label="Your profile & settings">
            <span className="avatar">{initial}</span>
            <span className="sidebar-profile-name">{firstName}</span>
          </Link>
        </div>
      </div>

      <main className="app-main">
        <div className="fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <Fighters />
    </div>
  );
}
