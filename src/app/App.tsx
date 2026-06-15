import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAuthInit } from "@/hooks/auth/useAuthInit";
import { Splash } from "@/components/Splash";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { DeniedPage } from "@/features/auth/components/DeniedPage";
import { SessionsPage } from "@/features/sessions/components/SessionsPage";
import { CharacterPage } from "@/features/hunter/components/CharacterPage";
import { PartyPage } from "@/features/party/components/PartyPage";
import { HandbookPage } from "@/features/handbook/components/HandbookPage";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

export default function App() {
  useAuthInit();
  const status = useAuthStore((s) => s.status);

  if (status === "loading" || status === "checking") {
    return <Splash message={status === "checking" ? "Checking the ledger…" : undefined} />;
  }

  if (status === "signedOut") {
    return <LoginPage />;
  }

  if (status === "denied") {
    return <DeniedPage />;
  }

  // status === "allowed"
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SessionsPage />} />
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
