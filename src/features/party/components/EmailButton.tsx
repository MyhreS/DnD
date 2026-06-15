import { useState } from "react";
import { MailIcon } from "@/components/icons";
import { AsyncButton } from "@/components/AsyncButton";
import type { ReminderResult } from "@/api/notifications";

/** A button that triggers a backend email send and reports the result. */
export function EmailButton({
  label,
  disabled,
  run,
}: {
  label: string;
  disabled?: boolean;
  run: () => Promise<ReminderResult>;
}) {
  const [result, setResult] = useState<string | null>(null);

  async function go() {
    setResult(null);
    try {
      const r = await run();
      setResult(
        r.sent > 0 ? `Sent ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}.` : "Nobody to email.",
      );
    } catch (err) {
      console.error(err);
      setResult("Couldn't send — is email configured?");
    }
  }

  return (
    <div>
      <AsyncButton
        className="btn-ghost"
        disabled={disabled}
        pendingText="Sending…"
        showDone={false}
        onClick={go}
      >
        <MailIcon width={16} height={16} /> {label}
      </AsyncButton>
      {result && (
        <p className="faint center" style={{ fontSize: "0.76rem", margin: "6px 0 0" }}>{result}</p>
      )}
    </div>
  );
}
