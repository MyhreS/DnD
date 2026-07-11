import { useEffect, useState } from "react";
import { mintCharacterAiToken } from "@/api/aiHelp";
import { useAuthStore } from "@/features/auth/store/authStore";
import { buildAiHelpPayload } from "../lib/aiHelpPayload";

// State machine for the "Get help from AI" toolbar button: mint the scoped
// token, put the paste-ready briefing on the clipboard, confirm — or offer a
// manual-copy popover when the browser blocks the automatic write.
//
// Safari only honours clipboard writes inside the user-gesture window, which a
// network await closes. So `run` hands the clipboard a promise-backed
// ClipboardItem SYNCHRONOUSLY (before any await) — Safari accepts that and
// resolves the write once the mint lands. If the write still throws, the
// payload opens in a popover whose "Copy" button is a fresh gesture.

const COPIED_MSG = "Copied — paste it to your AI and it can help you with your character.";
const FAILED_MSG = "Couldn't create the AI link — try again.";

function displayName(): string {
  const m = useAuthStore.getState().member;
  if (!m) return "";
  return [m.firstName, m.lastName].filter(Boolean).join(" ");
}

/** Start the clipboard write inside the CURRENT gesture, fed by the pending
 * payload. Returns null when promise-backed ClipboardItem isn't available. */
function writeDeferred(text: Promise<string>): Promise<void> | null {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return null;
  try {
    const item = new ClipboardItem({
      "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })),
    });
    return navigator.clipboard.write([item]);
  } catch {
    return null;
  }
}

export function useAiHelp(characterId: string) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  // Transient confirmations, like the autosave message.
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(""), 6000);
    return () => window.clearTimeout(t);
  }, [message]);

  /** AsyncButton onClick — throws on mint failure so the button shows its
   * error state. Nothing touches the clipboard unless the mint succeeded. */
  async function run(): Promise<void> {
    setMessage("");
    setFallbackText(null);
    const textPromise = mintCharacterAiToken(characterId).then((grant) =>
      buildAiHelpPayload(grant, displayName()),
    );
    // Must happen synchronously, still inside the click gesture (Safari).
    const write = writeDeferred(textPromise);

    let text: string;
    try {
      text = await textPromise;
    } catch (err) {
      write?.catch(() => {}); // the deferred write rejects with the mint — swallow it.
      setMessage(FAILED_MSG);
      throw err;
    }
    try {
      if (write) await write;
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setMessage(COPIED_MSG);
    } catch {
      // Token minted fine but the clipboard was blocked — manual copy popover.
      setFallbackText(text);
    }
  }

  /** The popover's Copy — a fresh user gesture, so a plain writeText works. */
  function copyFallback(): void {
    const text = fallbackText;
    if (text == null) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setFallbackText(null);
        setCopied(true);
        setMessage(COPIED_MSG);
      },
      () => setMessage("Copy failed — select the text in the box and copy it yourself."),
    );
  }

  return {
    copied,
    message,
    fallbackText,
    run,
    copyFallback,
    closeFallback: () => setFallbackText(null),
  };
}
