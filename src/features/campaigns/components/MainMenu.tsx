import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Sigil } from "@/components/icons";

export function MainMenu() {
  const member = useAuthStore((state) => state.member);
  return (
    <div className="reading">
      <div className="center" style={{ paddingTop: 6 }}>
        <Sigil width={56} height={56} />
        <p className="eyebrow" style={{ marginTop: 8 }}>Catacombs &amp; Starspawns</p>
        <h1 className="page-title" style={{ marginBottom: 2 }}>Welcome{member?.firstName ? `, ${member.firstName}` : ""}</h1>
        <p className="muted">Your companion for the hunt.</p>
      </div>

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>The game</p>
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          <em>Catacombs &amp; Starspawns</em> is a Bloodborne-flavoured dark-fantasy homebrew where the adventurers are <em>Hunters</em>. The current source set is the Book of the Deepcaller, Whispers, the character sheet, and the Hidden Condition handout.
        </p>
      </div>

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Find your way</p>
      <div className="stack" style={{ gap: 10 }}>
        <GuideCard to="/character" title="Hunters" body="Create and manage hunters with the current six-section character sheet. Every value is recorded exactly as your table decides it." />
        <GuideCard to="/game" title="Games" body="Open a current game, run initiative and recorded vitals, or revisit a previous session." />
        <GuideCard to="/codex" title="Codex" body="Search the current Book of the Deepcaller, Whispers, character sheet, and Hidden Condition handout, with the source shown for every entry." />
        <GuideCard to="/profile" title="Profile" body="Your account, appearance, and app version." />
      </div>

      <div className="rule-ornament">◆</div>
      <Link className="btn btn-ghost" to="/codex">Open the Codex</Link>
    </div>
  );
}

function GuideCard({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link to={to} className="card card-hover" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</div>
      <div className="muted" style={{ marginTop: 2, fontSize: ".88rem" }}>{body}</div>
      <div className="gold" style={{ marginTop: 6, fontSize: ".8rem" }}>Open →</div>
    </Link>
  );
}
