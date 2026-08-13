import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil } from "@/components/icons";

/** The main menu: the stable player surfaces and their purpose. */
export function MainMenu() {
  const member = useAuthStore((s) => s.member);

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

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Find your way</p>
      <div className="stack" style={{ gap: 10 }}>
        <GuideCard to="/character" title="Hunters" body="Forge and manage hunters in two focused app views — a detailed sheet and a one-page play HUD." />
        <GuideCard to="/game" title="Game" body="See your active session, open your Hunter, follow the shared battle screen, and claim items found at the table." />
        <GuideCard to="/codex" title="Codex" body="Search the handbook, D&D rules, class boards, rites, character guidance, and the Player's Game Card in one place—with the source shown for every answer." />
        <GuideCard to="/profile" title="Profile" body="Your account and settings — tap your initial in the corner." />
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
