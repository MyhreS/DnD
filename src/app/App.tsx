import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useCampaignSync } from "@/features/campaigns/hooks/useCampaignSync";
import { useAuthInit } from "@/hooks/auth/useAuthInit";
import { Splash } from "@/components/Splash";
import { CardSkeleton } from "@/components/Skeleton";
import { Layout } from "@/components/Layout";
import { Landing } from "@/features/auth/components/Landing";
import { PublicLayout } from "@/features/auth/components/PublicLayout";
import { DeniedPage } from "@/features/auth/components/DeniedPage";
import { MainMenu } from "@/features/campaigns/components/MainMenu";
import { SessionsPage } from "@/features/sessions/components/SessionsPage";
import { CharacterPage } from "@/features/hunter/components/CharacterPage";
import { PlayPage } from "@/features/play/components/PlayPage";
import { PartyPage } from "@/features/party/components/PartyPage";
import { HandbookPage } from "@/features/handbook/components/HandbookPage";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

/** Routes that only make sense inside a campaign redirect to the menu without
 * one — but wait for campaigns to load first so a deep link / reload isn't
 * bounced before the active campaign is restored. */
function RequireCampaign({ children }: { children: React.ReactNode }) {
  const activeId = useCampaignStore((s) => s.activeId);
  const status = useCampaignStore((s) => s.status);
  if (status === "idle" || status === "loading") {
    return <CardSkeleton lines={3} />;
  }
  if (!activeId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthedApp() {
  useCampaignSync();
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route element={<Layout />}>
        <Route path="sessions" element={<RequireCampaign><SessionsPage /></RequireCampaign>} />
        <Route path="play" element={<RequireCampaign><PlayPage /></RequireCampaign>} />
        <Route path="party" element={<RequireCampaign><PartyPage /></RequireCampaign>} />
        <Route path="character" element={<CharacterPage />} />
        <Route path="hunter" element={<Navigate to="/character" replace />} />
        <Route path="handbook" element={<HandbookPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
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

  if (status === "denied") {
    return <DeniedPage />;
  }

  // status === "allowed"
  return <AuthedApp />;
}
