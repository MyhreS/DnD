import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignSync } from "@/features/campaigns/hooks/useCampaignSync";
import { useAuthInit } from "@/hooks/auth/useAuthInit";
import { Splash } from "@/components/Splash";
import { MainLayout } from "@/components/MainLayout";
import { Landing } from "@/features/auth/components/Landing";
import { PublicLayout } from "@/features/auth/components/PublicLayout";
import { Onboarding } from "@/features/auth/components/Onboarding";
import { MainMenu } from "@/features/campaigns/components/MainMenu";
import { CharacterPage } from "@/features/hunter/components/CharacterPage";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

// Heavy, rarely-first routes are code-split so their content data
// (generated Codex data / creature art / play scene) defers out of
// the first-paint bundle. Named exports are adapted to the default-export
// shape React.lazy expects.
const CodexPage = lazy(() =>
  import("@/features/codex/components/CodexPage").then((m) => ({ default: m.CodexPage })),
);
const CodexDocumentsPage = lazy(() =>
  import("@/features/codex/components/CodexPage").then((m) => ({ default: m.CodexDocumentsPage })),
);
const GamePage = lazy(() =>
  import("@/features/game/components/GamePage").then((m) => ({ default: m.GamePage })),
);
const BattleScreenPage = lazy(() =>
  import("@/features/game/components/BattleScreenPage").then((m) => ({ default: m.BattleScreenPage })),
);
const StatusPage = lazy(() =>
  import("@/features/status/components/StatusPage").then((m) => ({ default: m.StatusPage })),
);
/** Preserve old bookmarks and character-sheet deep links while bringing every
 * reference into the unified Codex. The old location determines the source;
 * specific chapter/section/item links become focused searches. */
function LegacyCodexRedirect() {
  const { pathname, search } = useLocation();
  const previous = new URLSearchParams(search);
  const next = new URLSearchParams();
  const previousQuery = previous.get("q");
  if (previousQuery) next.set("q", previousQuery);

  if (pathname === "/rules" || pathname === "/reference") {
    next.set("source", "rules-reference-scan");
  } else if (pathname === "/game-card") {
    next.set("source", "game-card");
  } else {
    const item = previous.get("item");
    const section = previous.get("section");
    const tab = previous.get("tab");
    if (item) {
      next.set("q", item.replaceAll("-", " "));
      next.set("source", item);
    } else if (section) {
      next.set("q", section.replaceAll("-", " "));
      next.set("source", "handbook");
    } else if (tab === "classes") {
      next.set("group", "Classes");
    } else if (tab === "rites") {
      next.set("group", "Rites");
    } else if (tab === "backgrounds" || tab === "feats" || tab === "armory") {
      next.set("q", tab === "armory" ? "equipment" : tab);
      next.set("source", "handbook");
    } else {
      next.set("source", "handbook");
    }
  }
  return <Navigate to={{ pathname: "/codex", search: next.toString() }} replace />;
}

function AuthedApp() {
  useCampaignSync();
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        {/* Main menu: account home, hunters, handbook, profile — no campaign. */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<MainMenu />} />
          <Route path="character" element={<CharacterPage />} />
          <Route path="game" element={<GamePage />} />
          <Route path="codex" element={<CodexPage />} />
          <Route path="codex/documents" element={<CodexDocumentsPage />} />
          <Route path="handbook" element={<LegacyCodexRedirect />} />
          <Route path="rules" element={<LegacyCodexRedirect />} />
          <Route path="game-card" element={<LegacyCodexRedirect />} />
          <Route path="reference" element={<LegacyCodexRedirect />} />
          <Route path="dm" element={<Navigate to="/game" replace />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* Read-only, chrome-less second display for a live Game session. */}
        <Route path="game/:gameId/battle" element={<BattleScreenPage />} />
        {/* Chrome-less big-screen status board (its own full-bleed layout). */}
        <Route path="status" element={<StatusPage />} />
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

  // Signed-out visitors get a public landing + Codex (deferred sign-in).
  if (status === "signedOut") {
    return (
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="codex" element={<CodexPage />} />
            <Route path="codex/documents" element={<CodexDocumentsPage />} />
            <Route path="handbook" element={<LegacyCodexRedirect />} />
            <Route path="rules" element={<LegacyCodexRedirect />} />
            <Route path="game-card" element={<LegacyCodexRedirect />} />
            <Route path="reference" element={<LegacyCodexRedirect />} />
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
