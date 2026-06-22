import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { APP_NAME } from "@/config";
import { Sigil, GoogleIcon } from "@/components/icons";

/** Public landing — what the app & game is, with a deferred sign-in CTA. No
 * login required to browse or read the handbook. */
export function Landing() {
  const signIn = useAuthStore((s) => s.signIn);
  const signingIn = useAuthStore((s) => s.signingIn);
  const error = useAuthStore((s) => s.error);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="center" style={{ paddingTop: 8 }}>
        <Sigil width={76} height={76} />
        <p className="eyebrow" style={{ marginTop: 10 }}>Player's Companion</p>
        <h1 style={{ fontSize: "2.1rem", marginBottom: 8 }}>{APP_NAME}</h1>
        <p className="muted" style={{ maxWidth: 540, margin: "0 auto" }}>
          A companion for a Bloodborne-flavoured dark-fantasy tabletop RPG, where adventurers are
          <em> Hunters</em>. Forge a hunter, join a campaign, and play at the table — live HP &amp;
          Sanity, inventory, trading, and a DM's command screen.
        </p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="center stack" style={{ gap: 10, maxWidth: 320, margin: "0 auto", width: "100%" }}>
        <button className="btn btn-google" onClick={() => void signIn()} disabled={signingIn}>
          {signingIn ? (
            <><span className="btn-spinner" aria-hidden /> Signing in…</>
          ) : (
            <><GoogleIcon /> Continue with Google</>
          )}
        </button>
        <Link className="btn btn-ghost" to="/handbook">Read the handbook</Link>
      </div>
      <p className="faint center" style={{ fontSize: "0.82rem", marginTop: -6 }}>
        No account needed to look around — sign in when you're ready to build a hunter or join a game.
      </p>

      <div className="derived-grid">
        <Feature title="Forge a hunter" body="Six classes & subclasses, point-buy abilities, skills, rites." />
        <Feature title="Play live" body="A lobby, DM phases, and live HP / Sanity / Blood Tinge." />
        <Feature title="Trade & survive" body="Swap gear, claim loot from the fallen, risk permadeath." />
        <Feature title="Run a table" body="DM tools: party status, items overview, trades, full control." />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div className="muted" style={{ fontSize: "0.88rem" }}>{body}</div>
    </div>
  );
}
