import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { AsyncButton } from "@/components/AsyncButton";
import { Sigil } from "@/components/icons";

/** First-login: a new user sets their name before entering the app. */
export function Onboarding() {
  const user = useAuthStore((s) => s.user);
  const saveProfile = useAuthStore((s) => s.saveProfile);
  const error = useAuthStore((s) => s.error);

  const guess = (user?.displayName ?? "").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(guess[0] ?? "");
  const [lastName, setLastName] = useState(guess.slice(1).join(" "));

  return (
    <div className="splash" style={{ minHeight: "100dvh" }}>
      <Sigil width={72} height={72} />
      <div className="center" style={{ maxWidth: 360 }}>
        <p className="eyebrow">Welcome, hunter</p>
        <h1 style={{ margin: "2px 0 6px" }}>What should we call you?</h1>
        <p className="muted">Your name appears to the others at your table.</p>
      </div>

      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <div className="field">
          <label htmlFor="ob-first">First name</label>
          <input
            id="ob-first"
            className="input"
            value={firstName}
            maxLength={40}
            placeholder="e.g. Eileen"
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ob-last">Last name</label>
          <input
            id="ob-last"
            className="input"
            value={lastName}
            maxLength={40}
            placeholder="(optional)"
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        {error && <div className="banner banner-error" style={{ marginBottom: 10 }}>{error}</div>}
        <AsyncButton
          className="btn-primary"
          pendingText="Saving…"
          showDone={false}
          disabled={!firstName.trim()}
          onClick={() => saveProfile(firstName, lastName)}
        >
          Enter the hunt
        </AsyncButton>
      </div>
    </div>
  );
}
