import { useCharacterView } from "@/app/characterView";

export function CharacterViewSetting() {
  const view = useCharacterView((state) => state.view);
  const setView = useCharacterView((state) => state.setView);

  return <div className="card">
    <p className="eyebrow">Hunter sheet</p>
    <h2 className="settings-card-title">Character view</h2>
    <p className="faint settings-card-copy">Choose which view opens for every hunter. View 4 is the standard experience.</p>
    <div className="btn-row settings-choice-row">
      <button type="button" className={`btn ${view === "hud" ? "btn-primary" : "btn-ghost"}`} aria-pressed={view === "hud"} onClick={() => setView("hud")}>View 4</button>
      <button type="button" className={`btn ${view === "quick" ? "btn-primary" : "btn-ghost"}`} aria-pressed={view === "quick"} onClick={() => setView("quick")}>View 3</button>
    </div>
  </div>;
}
