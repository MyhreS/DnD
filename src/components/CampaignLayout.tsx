import { NavLink, Navigate } from "react-router-dom";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useCampaignHunterSync } from "@/features/campaigns/hooks/useCampaignHunterSync";
import { CampaignRoleBanner } from "@/features/campaigns/components/CampaignRoleBanner";
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
  const campaigns = useCampaignStore((s) => s.campaigns);

  // Bring the hunter you chose for this campaign into play.
  useCampaignHunterSync();

  if (status === "idle" || status === "loading") {
    return <div className="app-main"><CardSkeleton lines={3} /></div>;
  }
  if (!activeId) return <Navigate to="/" replace />;
  if (!active) {
    // The id is set but the campaign doc hasn't streamed in yet. If it's one
    // of ours, hold the door (skeleton) instead of bouncing to the menu —
    // redirect only when the campaign truly isn't ours anymore.
    return campaigns.some((c) => c.id === activeId) ? (
      <div className="app-main"><CardSkeleton lines={3} /></div>
    ) : (
      <Navigate to="/" replace />
    );
  }

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
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/hunter">Hunter</NavLink>
          <NavLink to="/" end className="nav-back">
            <ChevronIcon width={15} height={15} className="icon-flip" />
            Main menu
          </NavLink>
        </>
      }
      banner={<CampaignRoleBanner />}
    />
  );
}
