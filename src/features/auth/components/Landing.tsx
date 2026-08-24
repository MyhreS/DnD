import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { APP_NAME } from "@/config";
import { Sigil, GoogleIcon } from "@/components/icons";

/** Public landing. No login is needed to read the four current documents. */
export function Landing() {
  const signIn = useAuthStore((state) => state.signIn);
  const signingIn = useAuthStore((state) => state.signingIn);
  const error = useAuthStore((state) => state.error);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="center" style={{ paddingTop: 8 }}>
        <Sigil width={76} height={76} />
        <p className="eyebrow" style={{ marginTop: 10 }}>Player's Companion</p>
        <h1 style={{ marginBottom: 8, fontSize: "2.1rem" }}>{APP_NAME}</h1>
        <p className="muted" style={{ maxWidth: 540, margin: "0 auto" }}>
          A companion for a Bloodborne-flavoured dark-fantasy tabletop RPG, where adventurers are <em>Hunters</em>. Keep the current character sheet, Rites, Whispers, and live table session together without filling gaps from retired rules.
        </p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="center stack" style={{ gap: 10, maxWidth: 320, margin: "0 auto", width: "100%" }}>
        <button className="btn btn-google" onClick={() => void signIn()} disabled={signingIn}>
          {signingIn ? <><span className="btn-spinner" aria-hidden /> Signing in…</> : <><GoogleIcon /> Continue with Google</>}
        </button>
        <Link className="btn btn-ghost" to="/codex">Open the Codex</Link>
      </div>
      <p className="faint center" style={{ marginTop: -6, fontSize: ".82rem" }}>
        No account needed to read the current sources. Sign in when you are ready to keep a hunter or join a game.
      </p>

      <div className="derived-grid">
        <Feature title="Keep a hunter" body="One manual editor matching the game maker's current six-section character sheet, saved as you type." />
        <Feature title="Read the source" body="Search all 21 Rites and 6 Whispers, then open the exact PDF page behind an entry." />
        <Feature title="Play live" body="Run session lobbies, initiative, recorded HP, Armor Class, Sanity, and source-named conditions." />
        <Feature title="No ghost rules" body="Options omitted from the current documents are not silently restored from older books." />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return <div className="card"><div style={{ marginBottom: 4, fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</div><div className="muted" style={{ fontSize: ".88rem" }}>{body}</div></div>;
}
