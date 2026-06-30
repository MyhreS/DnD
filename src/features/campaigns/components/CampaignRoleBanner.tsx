import { useIsDM } from "../hooks/useIsDM";
import { useCampaignStore } from "../store/campaignStore";

/** A clear "who am I in this campaign" indicator in the campaign chrome:
 * - the DM sees a gold "You are the DM" badge;
 * - while the DM is *playing as* a hunter (to test the game), a prominent bar
 *   with a "Return to DM" button shows on every page.
 * Players see nothing extra (they're simply themselves). */
export function CampaignRoleBanner() {
  const isDM = useIsDM();
  const playingAsName = useCampaignStore((s) => s.playingAsName);
  const returnToDm = useCampaignStore((s) => s.returnToDm);

  if (!isDM) return null;

  if (playingAsName) {
    return (
      <div className="banner banner-warn row between" style={{ marginBottom: 14, gap: 10 }}>
        <span style={{ minWidth: 0 }}>
          <strong className="gold">Playing as {playingAsName}</strong>
          <span className="faint"> · acting for this hunter (you're the DM)</span>
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: "auto", flex: "none" }}
          onClick={returnToDm}
        >
          Return to DM
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <span
        className="chip"
        style={{ borderColor: "var(--gold-dim)", color: "var(--gold)", fontSize: "0.8rem" }}
      >
        ● You are the DM
      </span>
    </div>
  );
}
