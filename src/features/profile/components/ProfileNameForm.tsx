import { useState, type FormEvent } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";

export function ProfileNameForm() {
  const user = useAuthStore((state) => state.user);
  const member = useAuthStore((state) => state.member);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const error = useAuthStore((state) => state.error);
  const guessedName = (user?.displayName ?? "").trim().split(/\s+/);
  const initialFirstName = member?.firstName ?? guessedName[0] ?? "";
  const initialLastName = member?.lastName ?? guessedName.slice(1).join(" ");
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const unchanged = firstName.trim() === initialFirstName && lastName.trim() === initialLastName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstName.trim() || status === "saving" || unchanged) return;
    setStatus("saving");
    const saved = await saveProfile(firstName, lastName);
    setStatus(saved ? "saved" : "error");
  }

  return (
    <section className="card">
      <p className="eyebrow">Your name</p>
      <p className="muted" style={{ marginTop: 0 }}>
        This is how your name appears in the app and to the other players.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="field">
          <label htmlFor="profile-first-name">First name</label>
          <input
            id="profile-first-name"
            className="input"
            autoComplete="given-name"
            maxLength={40}
            required
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
              setStatus("idle");
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-last-name">Last name</label>
          <input
            id="profile-last-name"
            className="input"
            autoComplete="family-name"
            maxLength={40}
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);
              setStatus("idle");
            }}
          />
        </div>

        {status === "saved" && <div className="banner banner-ok" role="status">Name saved.</div>}
        {status === "error" && <div className="banner banner-error" role="alert">{error ?? "Couldn't save your name. Please try again."}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: 14 }}
          disabled={!firstName.trim() || unchanged || status === "saving"}
        >
          {status === "saving" ? "Saving…" : "Save name"}
        </button>
      </form>
    </section>
  );
}
