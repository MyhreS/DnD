import { NavLink, Navigate } from "react-router-dom";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useCampaignHunterSync } from "@/features/campaigns/hooks/useCampaignHunterSync";
import { CardSkeleton } from "@/components/Skeleton";
import { ChevronIcon } from "./icons";
import { Shell } from "./Shell";

/** Chrome for a campaign: Play, Sessions, Party, your Hunter, and a clear way
 * back to the main menu. Gated on an active campaign (so deep links / reloads
 * wait for campaigns to load before redirecting). */
export function CampaignLayout() {
  const active = useCampaignStore((s) => s.active);
  const activeId = useCampaignStore((s) => s.activeId);
  const status = useCampaignStore((s) => s.status);

  // Bring the hunter you chose for this campaign into play.
  useCampaignHunterSync();

  if (status === "idle" || status === "loading") {
    return <div className="app-main"><CardSkeleton lines={3} /></div>;
  }
  if (!activeId || !active) return <Navigate to="/" replace />;

  return (
    <Shell
      eyebrow="Campaign"
      title={active.name}
      titleTo="/play"
      nav={
        <>
          <NavLink to="/play">Play</NavLink>
          <NavLink to="/sessions">Sessions</NavLink>
          <NavLink to="/party">Party</NavLink>
          <NavLink to="/hunter">Hunter</NavLink>
          <NavLink to="/" end className="nav-back">
            <ChevronIcon width={15} height={15} className="icon-flip" />
            Main menu
          </NavLink>
        </>
      }
    />
  );
}
