import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSettings } from "@/app/settings";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignSync } from "@/features/campaigns/hooks/useCampaignSync";
import { useAuthInit } from "@/hooks/auth/useAuthInit";
import { Splash } from "@/components/Splash";
import { MainLayout } from "@/components/MainLayout";
import { CampaignLayout } from "@/components/CampaignLayout";
import { Landing } from "@/features/auth/components/Landing";
import { PublicLayout } from "@/features/auth/components/PublicLayout";
import { Onboarding } from "@/features/auth/components/Onboarding";
import { MainMenu } from "@/features/campaigns/components/MainMenu";
import { SessionsPage } from "@/features/sessions/components/SessionsPage";
import { CharacterPage } from "@/features/hunter/components/CharacterPage";
import { CampaignHunterPage } from "@/features/hunter/components/CampaignHunterPage";
import { PartyPage } from "@/features/party/components/PartyPage";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

// Heavy, rarely-first routes are code-split so their content data
// (handbookIndex / rulesReference / creature art / play scene) defers out of
// the first-paint bundle. Named exports are adapted to the default-export
// shape React.lazy expects.
const HandbookPage = lazy(() =>
  import("@/features/handbook/components/HandbookPage").then((m) => ({ default: m.HandbookPage })),
);
const RulesReferencePage = lazy(() =>
  import("@/features/rules-reference/components/RulesReferencePage").then((m) => ({
    default: m.RulesReferencePage,
  })),
);
const PlayPage = lazy(() =>
  import("@/features/play/components/PlayPage").then((m) => ({ default: m.PlayPage })),
);
const ShopPage = lazy(() =>
  import("@/features/shop/components/ShopPage").then((m) => ({ default: m.ShopPage })),
);
const LogPage = lazy(() =>
  import("@/features/log/components/LogPage").then((m) => ({ default: m.LogPage })),
);
const DMOverviewPage = lazy(() =>
  import("@/features/dm/components/DMOverviewPage").then((m) => ({ default: m.DMOverviewPage })),
);
const StatusPage = lazy(() =>
  import("@/features/status/components/StatusPage").then((m) => ({ default: m.StatusPage })),
);

/** The Reference page became Rules — keep old bookmarks and the sheet's
 * deep links (`/reference?q=…`) working, query string included. */
function LegacyReferenceRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/rules", search }} replace />;
}

function AuthedApp() {
  useCampaignSync();
  // Campaigns/sessions/live play are experimental — hidden unless enabled.
  const experimental = useSettings((s) => s.experimental);
  // The DM overview only exists when Dungeon Master mode is on (Profile).
  const dmMode = useSettings((s) => s.dmMode);
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        {/* Main menu: account home, hunters, handbook, profile — no campaign. */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<MainMenu />} />
          <Route path="character" element={<CharacterPage />} />
          <Route path="handbook" element={<HandbookPage />} />
          <Route path="rules" element={<RulesReferencePage />} />
          <Route path="reference" element={<LegacyReferenceRedirect />} />
          <Route path="dm" element={dmMode ? <DMOverviewPage /> : <Navigate to="/" replace />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* Campaign: gated on an active campaign by CampaignLayout. */}
        <Route element={<CampaignLayout />}>
          <Route path="play" element={<PlayPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="party" element={<PartyPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="log" element={<LogPage />} />
          <Route path="hunter" element={<CampaignHunterPage />} />
        </Route>
        {/* Chrome-less big-screen status board (its own full-bleed layout). */}
        <Route path="status" element={experimental ? <StatusPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  useAuthInit();
  const status = useAuthStore((s) => s.status);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);

  if (status === "loading" || status === "checking") {
    return <Splash message={status === "checking" ? "Checking the ledger…" : undefined} />;
  }

  // Signed-out visitors get a public landing + handbook (deferred sign-in).
  if (status === "signedOut") {
    return (
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="handbook" element={<HandbookPage />} />
            <Route path="rules" element={<RulesReferencePage />} />
            <Route path="reference" element={<LegacyReferenceRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    );
  }

  // First login with no name yet → set it before entering.
  if (needsOnboarding) {
    return <Onboarding />;
  }

  // status === "allowed" (anyone signed in)
  return <AuthedApp />;
}
