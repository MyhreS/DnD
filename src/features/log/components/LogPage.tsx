import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { CardSkeleton } from "@/components/Skeleton";
import { useCampaignActivity } from "../hooks/useCampaignActivity";
import { typeGlyph, timeLabel, groupByDay } from "../lib/format";
import type { ActivityEvent } from "@/types";

/** The campaign chronicle: everything that has happened, newest first. */
export function LogPage() {
  const activeId = useCampaignStore((s) => s.activeId);
  const { events, error } = useCampaignActivity(activeId);

  return (
    <div className="reading">
      <p className="eyebrow">The Chronicle</p>
      <h1 className="page-title">Log</h1>
      <p className="page-intro">
        Everything that has happened in this campaign — hunts, rests, deaths, loot and gold.
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      {events === null ? (
        <div className="stack" style={{ gap: 10 }}>
          <CardSkeleton lines={3} />
          <CardSkeleton lines={3} />
        </div>
      ) : events.length === 0 ? (
        <div className="card center">
          <p className="muted" style={{ margin: 0 }}>
            Nothing chronicled yet — events appear here as the campaign unfolds.
          </p>
        </div>
      ) : (
        groupByDay(events).map((g) => (
          <section key={g.day}>
            <p className="eyebrow" style={{ margin: "18px 0 8px" }}>{g.day}</p>
            <div className="card" style={{ padding: "4px 14px" }}>
              {g.events.map((e) => (
                <LogLine key={e.id} event={e} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function LogLine({ event }: { event: ActivityEvent }) {
  return (
    <div
      className="row"
      style={{
        gap: 10,
        alignItems: "baseline",
        padding: "9px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span className="gold" aria-hidden style={{ flex: "none", width: 16, textAlign: "center" }}>
        {typeGlyph(event.type)}
      </span>
      <span style={{ fontSize: "0.9rem", minWidth: 0 }}>{event.message}</span>
      <span className="faint" style={{ flex: "none", marginLeft: "auto", fontSize: "0.75rem" }}>
        {timeLabel(event.at)}
      </span>
    </div>
  );
}
