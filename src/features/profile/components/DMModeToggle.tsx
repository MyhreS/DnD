import { useSettings } from "@/app/settings";

export function DMModeToggle() {
  const dmMode = useSettings((s) => s.dmMode);
  const setDmMode = useSettings((s) => s.setDmMode);

  return (
    <div className="card">
      <p className="eyebrow">Dungeon Master mode</p>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: "0.9rem" }}>I run the table as DM</span>
        <div className="btn-row">
          <button
            className={`btn ${dmMode ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setDmMode(true)}
          >
            On
          </button>
          <button
            className={`btn ${!dmMode ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setDmMode(false)}
          >
            Off
          </button>
        </div>
      </div>
      <p className="faint" style={{ fontSize: "0.76rem", margin: 0 }}>
        See every hunter&rsquo;s character sheet in a DM overview — read-only,
        for quick reference at the table.
      </p>
    </div>
  );
}
