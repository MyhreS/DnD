import { Link, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil } from "./icons";
import { Fighters } from "./fighters/Fighters";
import { UpdateBar } from "./UpdateBar";
import { usePlaySync } from "@/features/play/hooks/usePlaySync";
import { LiveGameBanner } from "@/features/play/components/LiveGameBanner";

/** The app frame (sidebar on desktop, top bar on mobile). The two contexts —
 * the main menu and a campaign — supply their own title + nav via this shell. */
export function Shell({
  eyebrow,
  title,
  titleTo,
  nav,
  banner,
}: {
  eyebrow?: string;
  title: string;
  titleTo: string;
  nav: ReactNode;
  /** Optional banner shown above the page content (e.g. the DM role / play-as bar). */
  banner?: ReactNode;
}) {
  const member = useAuthStore((s) => s.member);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Keep the active campaign's live-game subscription running (powers the banner).
  usePlaySync();

  const firstName = member?.firstName || user?.displayName || user?.email || "Hunter";
  const initial = firstName.trim().charAt(0).toUpperCase() || "H";

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <header className="app-header">
          <Link to={titleTo} className="brand" aria-label={title}>
            <Sigil className="brand-mark" />
            <span className="brand-title">
              {eyebrow && <span className="brand-eyebrow">{eyebrow}</span>}
              {title}
            </span>
          </Link>
          <Link to="/profile" aria-label="Your profile" className="avatar avatar-top">
            {initial}
          </Link>
        </header>

        <nav className="top-tabs" aria-label="Primary">
          {nav}
        </nav>

        <div className="sidebar-foot">
          <LiveGameBanner />
          <UpdateBar />
          <Link to="/profile" className="sidebar-profile" aria-label="Your profile & settings">
            <span className="avatar">{initial}</span>
            <span className="sidebar-profile-name">{firstName}</span>
          </Link>
        </div>
      </div>

      <main className="app-main">
        {banner}
        <div className="fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <Fighters />
    </div>
  );
}
