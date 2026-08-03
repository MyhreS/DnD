import { Link } from "react-router-dom";
import { useSettings } from "@/app/settings";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil } from "@/components/icons";
import { CampaignsHome } from "./CampaignsHome";

/** The "main menu" home — info only: what the game is and where everything
 * lives in the app. Hunters are created & managed on the Hunters page; the
 * campaigns block appears here once experimental features are switched on. */
export function MainMenu() {
  const member = useAuthStore((s) => s.member);
  const experimental = useSettings((s) => s.experimental);

  return (
    <div className="reading">
      <div className="center" style={{ paddingTop: 6 }}>
        <Sigil width={56} height={56} />
        <p className="eyebrow" style={{ marginTop: 8 }}>Catacombs &amp; Starspawns</p>
        <h1 className="page-title" style={{ marginBottom: 2 }}>
          Welcome{member?.firstName ? `, ${member.firstName}` : ""}
        </h1>
        <p className="muted">Your companion for the hunt.</p>
      </div>

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>The game</p>
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          <em>Catacombs &amp; Starspawns</em> is a Bloodborne-flavoured dark-fantasy homebrew
          where the adventurers are <em>Hunters</em>. Descend into the catacombs, cling to
          your Sanity, and hunt what crawled out of the dark — knowing full well the dark
          hunts back.
        </p>
      </div>

      {experimental && <CampaignsHome />}

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Find your way</p>
      <div className="stack" style={{ gap: 10 }}>
        <GuideCard to="/character" title="Hunters" body="Forge new hunters and manage the ones you have — a six-page paper sheet, saved as you write." />
        <GuideCard to="/codex" title="Codex" body="Search the handbook, D&D rules, class boards, rites, character guidance, and the Player's Game Card in one place—with the source shown for every answer." />
        <GuideCard to="/profile" title="Profile" body="Your account and settings — tap your initial in the corner. Experimental features are switched on here." />
        {experimental && (
          <GuideCard title="Campaigns" body="Create or join one above, then enter it for Sessions, the Party, the Shop, the Log, and live Play." />
        )}
      </div>

      <div className="rule-ornament">◆</div>
      <Link className="btn btn-ghost" to="/codex">Open the Codex</Link>
    </div>
  );
}

/** One row of the app guide: where a page is and what it's for. */
function GuideCard({ to, title, body }: { to?: string; title: string; body: string }) {
  const inner = (
    <>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</div>
      <div className="muted" style={{ fontSize: "0.88rem", marginTop: 2 }}>{body}</div>
    </>
  );
  if (!to) return <div className="card">{inner}</div>;
  return (
    <Link to={to} className="card card-hover" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      {inner}
      <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>Open →</div>
    </Link>
  );
}
