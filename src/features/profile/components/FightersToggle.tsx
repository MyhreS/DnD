import { useSettings } from "@/app/settings";

export function FightersToggle() {
  const fighters = useSettings((s) => s.fighters);
  const setFighters = useSettings((s) => s.setFighters);

  return (
    <div className="card">
      <p className="eyebrow">Effects</p>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: "0.9rem" }}>Animated fighters</span>
        <div className="btn-row">
          <button
            className={`btn ${fighters ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFighters(true)}
          >
            On
          </button>
          <button
            className={`btn ${!fighters ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFighters(false)}
          >
            Off
          </button>
        </div>
      </div>
      <p className="faint" style={{ fontSize: "0.76rem", margin: 0 }}>
        The occasional hunter that walks across the screen to fight. Turn it off if
        it gets distracting.
      </p>
    </div>
  );
}
