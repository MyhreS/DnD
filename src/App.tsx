import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { Splash } from "./components/Splash";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DeniedPage } from "./pages/DeniedPage";
import { SessionsPage } from "./pages/SessionsPage";
import { HunterPage } from "./pages/HunterPage";
import { HandbookPage } from "./pages/HandbookPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PartyPage } from "./pages/PartyPage";

export default function App() {
  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, [init]);

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
        <Route path="hunter" element={<HunterPage />} />
        <Route path="party" element={<PartyPage />} />
        <Route path="handbook" element={<HandbookPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
