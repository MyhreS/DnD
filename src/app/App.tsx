import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAuthInit } from "@/hooks/auth/useAuthInit";
import { Splash } from "@/components/Splash";
import { Layout } from "@/components/Layout";
import { Landing } from "@/features/auth/components/Landing";
import { PublicLayout } from "@/features/auth/components/PublicLayout";
import { DeniedPage } from "@/features/auth/components/DeniedPage";
import { SessionsPage } from "@/features/sessions/components/SessionsPage";
import { CharacterPage } from "@/features/hunter/components/CharacterPage";
import { PlayPage } from "@/features/play/components/PlayPage";
import { PartyPage } from "@/features/party/components/PartyPage";
import { HandbookPage } from "@/features/handbook/components/HandbookPage";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

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
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SessionsPage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="character" element={<CharacterPage />} />
        <Route path="hunter" element={<Navigate to="/character" replace />} />
        <Route path="party" element={<PartyPage />} />
        <Route path="handbook" element={<HandbookPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
