import { Sigil } from "./icons";

export function Splash({ message = "Lighting the lantern…" }: { message?: string }) {
  return (
    <div className="splash">
      <Sigil width={64} height={64} />
      <div className="spinner" aria-hidden />
      <p className="muted">{message}</p>
    </div>
  );
}
