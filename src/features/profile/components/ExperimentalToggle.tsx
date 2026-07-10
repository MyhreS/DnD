import { useSettings } from "@/app/settings";

export function ExperimentalToggle() {
  const experimental = useSettings((s) => s.experimental);
  const setExperimental = useSettings((s) => s.setExperimental);

  return (
    <div className="card">
      <p className="eyebrow">Experimental features</p>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: "0.9rem" }}>Campaigns &amp; live play</span>
        <div className="btn-row">
          <button
            className={`btn ${experimental ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setExperimental(true)}
          >
            On
          </button>
          <button
            className={`btn ${!experimental ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setExperimental(false)}
          >
            Off
          </button>
        </div>
      </div>
      <p className="faint" style={{ fontSize: "0.76rem", margin: 0 }}>
        Campaigns, sessions and live play are still being tested. Turn this on
        to try them.
      </p>
    </div>
  );
}
