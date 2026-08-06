import { useState, type FormEvent } from "react";
import { inviteWorkshopMember } from "@/api/workshop";

export function AdminInvite() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const invited = await inviteWorkshopMember(email);
      setMessage(`${invited} can now sign in.`);
      setEmail("");
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "Could not add this person.");
    }
  }

  return (
    <div className="invite-control">
      <button className="text-button" type="button" onClick={() => setOpen((value) => !value)}>Invite someone</button>
      {open && <form className="invite-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="invite-email">Google account email</label>
        <div><input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" data-testid="invite-email" /><button className="primary-button compact" data-testid="invite-submit">Invite</button></div>
        {message && <p>{message}</p>}
      </form>}
    </div>
  );
}
