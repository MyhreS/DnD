import { Link, useNavigate } from "react-router-dom";
import { useSettings } from "@/app/settings";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "@/features/hunter/hooks/useHunterCard";
import { HunterListCard } from "@/features/hunter/components/HunterListCard";
import { Sigil } from "@/components/icons";
import { useCampaignStore } from "../store/campaignStore";
import { CampaignsHome } from "./CampaignsHome";

/** The "main menu" home: your hunters and the handbook — plus campaigns, once
 * experimental features are switched on (they're still being tested). */
export function MainMenu() {
  const member = useAuthStore((s) => s.member);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const characters = usePlayerStore((s) => s.characters);
  const select = usePlayerStore((s) => s.select);
  const experimental = useSettings((s) => s.experimental);
  const navigate = useNavigate();
  useHunterCard();

  return (
    <div className="reading">
      <div className="center" style={{ paddingTop: 6 }}>
        <Sigil width={56} height={56} />
        <p className="eyebrow" style={{ marginTop: 8 }}>Catacombs &amp; Starspawns</p>
        <h1 className="page-title" style={{ marginBottom: 2 }}>
          Welcome{member?.firstName ? `, ${member.firstName}` : ""}
        </h1>
        <p className="muted">
          {experimental
            ? "Join a campaign or start your own, then bring a hunter to the table."
            : "Forge your hunters and study the handbook."}
        </p>
      </div>

      {experimental && <CampaignsHome />}

      <p className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Your hunters</p>
      {characters.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>No hunters yet. Forge one to play.</p></div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {characters.map((c) => (
            <HunterListCard
              key={c.id}
              card={c}
              campaignName={experimental ? (campaigns.find((x) => x.id === c.campaignId)?.name ?? null) : null}
              onOpen={() => { select(c.id); navigate("/character?edit=1"); }}
              onEdit={() => { select(c.id); navigate("/character?edit=1"); }}
            />
          ))}
        </div>
      )}
      <Link className="btn btn-primary" to="/character?new=1" style={{ marginTop: 12 }}>Create hunter</Link>

      <div className="rule-ornament">◆</div>
      <Link className="btn btn-ghost" to="/handbook">Read the handbook</Link>
    </div>
  );
}
