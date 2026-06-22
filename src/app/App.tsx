import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignSync } from "@/features/campaigns/hooks/useCampaignSync";
import { useAuthInit } from "@/hooks/auth/useAuthInit";
import { Splash } from "@/components/Splash";
import { MainLayout } from "@/components/MainLayout";
import { CampaignLayout } from "@/components/CampaignLayout";
import { Landing } from "@/features/auth/components/Landing";
import { PublicLayout } from "@/features/auth/components/PublicLayout";
import { MainMenu } from "@/features/campaigns/components/MainMenu";
import { SessionsPage } from "@/features/sessions/components/SessionsPage";
import { CharacterPage } from "@/features/hunter/components/CharacterPage";
import { CampaignHunterPage } from "@/features/hunter/components/CampaignHunterPage";
import { PlayPage } from "@/features/play/components/PlayPage";
import { PartyPage } from "@/features/party/components/PartyPage";
import { HandbookPage } from "@/features/handbook/components/HandbookPage";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

function AuthedApp() {
  useCampaignSync();
  return (
    <Routes>
      {/* Main menu: account home, hunters, handbook, profile — no campaign. */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<MainMenu />} />
        <Route path="character" element={<CharacterPage />} />
        <Route path="handbook" element={<HandbookPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      {/* Campaign: gated on an active campaign by CampaignLayout. */}
      <Route element={<CampaignLayout />}>
        <Route path="play" element={<PlayPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="party" element={<PartyPage />} />
        <Route path="hunter" element={<CampaignHunterPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useAuthInit();
  const status = useAuthStore((s) => s.status);

  if (status === "loading" || status === "checking") {
    return <Splash message={status === "checking" ? "Checking the ledger…" : undefined} />;
  }

  // Signed-out visitors get a public landing + handbook (deferred sign-in).
  if (status === "signedOut") {
    return (
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="handbook" element={<HandbookPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // status === "allowed" (anyone signed in)
  return <AuthedApp />;
}
