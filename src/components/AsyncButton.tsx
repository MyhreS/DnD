import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type State = "idle" | "pending" | "done" | "error";

/**
 * A button for async actions. Shows a spinner + pending label while the
 * promise is in flight, then a brief success/error state — so it's always
 * obvious the tap registered and something is happening.
 */
export function AsyncButton({
  onClick,
  children,
  className = "btn-ghost",
  style,
  disabled,
  pendingText,
  doneText = "Done",
  showDone = true,
  type = "button",
  resetMs = 1600,
}: {
  onClick: () => Promise<unknown> | unknown;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  pendingText?: ReactNode;
  doneText?: ReactNode;
  /** Set false if the surrounding UI already shows the result. */
  showDone?: boolean;
  type?: "button" | "submit";
  resetMs?: number;
}) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handle() {
    if (state === "pending" || disabled) return;
    setState("pending");
    try {
      await onClick();
      setState(showDone ? "done" : "idle");
    } catch {
      setState("error");
    }
    window.clearTimeout(timer.current);
    if (resetMs > 0) timer.current = window.setTimeout(() => setState("idle"), resetMs);
  }

  return (
    <button
      type={type}
      className={`btn ${className}`}
      style={style}
      disabled={disabled || state === "pending"}
      onClick={() => void handle()}
    >
      {state === "pending" ? (
        <>
          <span className="btn-spinner" aria-hidden /> {pendingText ?? children}
        </>
      ) : state === "done" ? (
        <>✓ {doneText}</>
      ) : state === "error" ? (
        <>⚠ Try again</>
      ) : (
        children
      )}
    </button>
  );
}
