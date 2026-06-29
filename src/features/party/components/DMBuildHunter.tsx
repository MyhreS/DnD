import { useState } from "react";
import { CharacterEditor } from "@/features/hunter/components/CharacterEditor";
import { emptyCard } from "@/lib/character";
import { saveCharacter } from "@/api/players";
import { setMemberCharacter } from "@/api/campaigns";
import type { CampaignMember, HunterCard } from "@/types";

/** DM-only: author a hunter for a campaign member who has none. The character is
 * owned by that player (ownerUid = member.uid) so they keep full control; it's
 * bound to the campaign and set as the member's character. */
export function DMBuildHunter({ members, campaignId }: { members: CampaignMember[]; campaignId: string }) {
  const [building, setBuilding] = useState<CampaignMember | null>(null);
  const [draft, setDraft] = useState<HunterCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needHunter = members.filter(
    (m) => m.role !== "dm" && !m.characterId && !m.uid.startsWith("bot-"),
  );

  function start(m: CampaignMember) {
    setBuilding(m);
    setDraft(emptyCard({ ownerUid: m.uid, email: m.email, displayName: m.name }));
    setError(null);
  }

  async function handleSave(card: HunterCard) {
    if (!building) return;
    setSaving(true);
    setError(null);
    try {
      const toSave = { ...card, campaignId };
      await saveCharacter(toSave);
      await setMemberCharacter(campaignId, building.uid, toSave.id);
      setBuilding(null);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the hunter.");
    } finally {
      setSaving(false);
    }
  }

  if (building && draft) {
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Building a hunter for {building.name}</p>
        <CharacterEditor
          initial={draft}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={() => {
            setBuilding(null);
            setDraft(null);
          }}
        />
      </div>
    );
  }

  if (needHunter.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Build a hunter for a player</p>
      <div className="stack" style={{ gap: 8 }}>
        {needHunter.map((m) => (
          <div key={m.uid} className="row between" style={{ gap: 8 }}>
            <span style={{ minWidth: 0 }}>
              {m.name}
              <span className="faint" style={{ fontSize: "0.78rem" }}> · no hunter yet</span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: "auto", flex: "none" }}
              onClick={() => start(m)}
            >
              Build a hunter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
