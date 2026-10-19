import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";
export type WorkspaceAccess = { available: false } | { available: true; label: string; url: string };
const access = httpsCallable<undefined, WorkspaceAccess>(functions, "getPrivateWorkspaceAccess");
const revoke = httpsCallable<undefined, {ok: boolean}>(functions, "revokePrivateWorkspaceSessions");
export async function getWorkspaceAccess(): Promise<WorkspaceAccess> { const result = (await access()).data; if (result.available) await auth.currentUser?.getIdToken(true); return result; }
export async function lockWorkspaceSessions(): Promise<void> { await revoke(); }
