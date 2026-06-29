import { useNavigate } from "react-router-dom";
import { AsyncButton } from "@/components/AsyncButton";
import { useCampaignStore } from "../store/campaignStore";

/** Spin up a real, throwaway "Test Run" campaign seeded with the DM + 5 bot
 * hunters, then drop the DM straight into play. */
export function TestCampaignButton() {
  const createTest = useCampaignStore((s) => s.createTest);
  const navigate = useNavigate();
  return (
    <div style={{ marginTop: 10 }}>
      <AsyncButton
        className="btn btn-ghost btn-sm"
        style={{ width: "auto" }}
        pendingText="Seeding a test run…"
        showDone={false}
        onClick={async () => {
          const id = await createTest();
          if (id) navigate("/play");
        }}
      >
        ⚙ Create a test campaign (you + 5 bots)
      </AsyncButton>
      <p className="faint" style={{ fontSize: "0.78rem", marginTop: 4, marginBottom: 0 }}>
        A throwaway “Test Run” campaign seeded with 5 bot hunters so you can see how a full table looks &amp; plays.
      </p>
    </div>
  );
}
