import { createPortal } from "react-dom";

export interface UpgradeSummary {
  level: number;
  /** [label, before, after] for every value that changed. */
  changes: Array<[string, string, string]>;
  features: string[];
}

/** Full-screen "you levelled up" moment after saving an upgrade: what was
 * reached and what it gave, so there is no doubt it worked. */
export function CharacterSheetUpgradeCelebration({ summary, onClose }: { summary: UpgradeSummary; onClose: () => void }) {
  return createPortal(
    <div className="upgrade-celebration" role="dialog" aria-modal="true" aria-labelledby="upgrade-celebration-title" onClick={onClose}>
      <div className="upgrade-celebration-burst" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ ["--i" as string]: index }} />)}</div>
      <section className="upgrade-celebration-card" onClick={(event) => event.stopPropagation()}>
        <div className="upgrade-celebration-medal" aria-hidden="true"><span>{summary.level}</span></div>
        <small>Upgrade saved</small>
        <h2 id="upgrade-celebration-title">Level {summary.level} reached!</h2>
        {summary.changes.length > 0 && <ul className="upgrade-celebration-gains">{summary.changes.map(([label, before, after]) => <li key={label}><span>{label}</span><b>{before} → {after}</b></li>)}</ul>}
        {summary.features.length > 0 && <p className="upgrade-celebration-features"><b>New:</b> {summary.features.join(", ")}</p>}
        <p className="upgrade-celebration-done">Everything is applied to your sheet. You can see it any time in Insight &amp; Level → See level history.</p>
        <button type="button" onClick={onClose} autoFocus>Continue</button>
      </section>
    </div>,
    document.body,
  );
}
