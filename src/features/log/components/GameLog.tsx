import { Link } from "react-router-dom";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useCampaignActivity } from "../hooks/useCampaignActivity";
import { LogLine } from "./LogLine";

const MAX_LINES = 12;

/** The live log shown at the table (Play page): what has happened during this
 * game (events since it was created), newest first, with the full chronicle a
 * tap away. */
export function GameLog({ since }: { since: number }) {
  const activeId = useCampaignStore((s) => s.activeId);
  const { events } = useCampaignActivity(activeId);
  if (events === null) return null; // loading — the game view above carries the page

  const recent = events.filter((e) => e.at >= since);

  return (
    <div className="card">
      <div className="row between" style={{ alignItems: "baseline" }}>
        <p className="eyebrow" style={{ margin: 0 }}>Log</p>
        <Link className="gold" to="/log" style={{ fontSize: "0.8rem", flex: "none" }}>
          Full log →
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.88rem" }}>
          Nothing logged this game yet — joins, mode changes, loot and rests land here live.
        </p>
      ) : (
        <div style={{ marginTop: 4 }}>
          {recent.slice(0, MAX_LINES).map((e) => (
            <LogLine key={e.id} event={e} />
          ))}
          {recent.length > MAX_LINES && (
            <p className="faint" style={{ margin: "8px 0 0", fontSize: "0.78rem" }}>
              +{recent.length - MAX_LINES} earlier this game — see the full log.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
