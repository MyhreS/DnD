export function AccessScreen({
  mode,
  onSignIn,
  onSignOut,
}: {
  mode: "signed_out" | "denied";
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const denied = mode === "denied";
  return (
    <main className="access-screen">
      <div className="access-mark" aria-hidden>W</div>
      <p className="eyebrow">Catacombs &amp; Starspawns</p>
      <h1>D&amp;D Workshop</h1>
      <p>{denied ? "This Google account has not been invited." : "A private place to send feedback directly to the person improving the game."}</p>
      <button className="primary-button" type="button" onClick={() => void (denied ? onSignOut() : onSignIn())}>
        {denied ? "Use another account" : "Sign in with Google"}
      </button>
    </main>
  );
}
