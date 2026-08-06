import { useEffect, useState } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { claimWorkshopAccess, subscribeAgentState, subscribeWorkshopTickets } from "@/api/workshop";
import { workshopAuth, workshopGoogleProvider } from "@/workshop/firebase";
import { workshopErrorMessage } from "@/workshop/lib/errors";
import type { AgentState, WorkshopTicket } from "@/workshop/types";

export type WorkshopSession = {
  user: User | null;
  status: "loading" | "signed_out" | "allowed" | "denied";
  role: "admin" | "creator" | null;
  error: string | null;
  tickets: WorkshopTicket[];
  agentState: AgentState | null;
};

async function maybeTestSignIn(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const token = new URLSearchParams(window.location.search).get("testToken");
  if (token && !workshopAuth.currentUser) await signInWithCustomToken(workshopAuth, token);
}

export function useWorkshopSession(): WorkshopSession & {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<WorkshopSession>({
    user: null,
    status: "loading",
    role: null,
    error: null,
    tickets: [],
    agentState: null,
  });

  useEffect(() => {
    void getRedirectResult(workshopAuth).catch((failure) => {
      setSession((current) => ({ ...current, error: workshopErrorMessage(failure, "Could not finish signing in. Please try again.") }));
    });
    void maybeTestSignIn().catch((failure) => {
      setSession((current) => ({ ...current, error: workshopErrorMessage(failure, "Could not open the test session.") }));
    });
    let stopTickets: (() => void) | undefined;
    let stopAgent: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(workshopAuth, async (user) => {
      stopTickets?.();
      stopAgent?.();
      if (!user) {
        setSession({ user: null, status: "signed_out", role: null, error: null, tickets: [], agentState: null });
        return;
      }
      setSession((current) => ({ ...current, user, status: "loading", error: null }));
      try {
        const role = await claimWorkshopAccess();
        stopTickets = subscribeWorkshopTickets(
          (tickets) => setSession((current) => ({ ...current, tickets })),
          (failure) => setSession((current) => ({ ...current, error: workshopErrorMessage(failure, "Could not update the request list.") })),
        );
        stopAgent = subscribeAgentState((agentState) => {
          setSession((current) => ({ ...current, agentState }));
        }, (failure) => {
          setSession((current) => ({ ...current, error: workshopErrorMessage(failure, "Could not update the agent status.") }));
        });
        setSession((current) => ({ ...current, user, role, status: "allowed" }));
      } catch {
        setSession((current) => ({
          ...current,
          user,
          status: "denied",
          role: null,
          error: "This Workshop is invitation-only.",
        }));
      }
    });
    return () => {
      stopAuth();
      stopTickets?.();
      stopAgent?.();
    };
  }, []);

  async function startSignIn() {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (standalone) await signInWithRedirect(workshopAuth, workshopGoogleProvider);
      else await signInWithPopup(workshopAuth, workshopGoogleProvider);
    } catch (failure) {
      setSession((current) => ({ ...current, error: workshopErrorMessage(failure, "Could not sign in. Please try again.") }));
    }
  }

  async function endSession() {
    try {
      await signOut(workshopAuth);
    } catch (failure) {
      setSession((current) => ({ ...current, error: workshopErrorMessage(failure, "Could not sign out. Please try again.") }));
    }
  }

  return { ...session, signIn: startSignIn, signOut: endSession };
}
