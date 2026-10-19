import type { User } from "firebase/auth";
export async function profile(user: User): Promise<{label: string; hasPassword: boolean}> {
  const response = await fetch("/api/profile", { headers:{Authorization:`Bearer ${await user.getIdToken()}`}, cache:"no-store" });
  if(!response.ok)throw Error("This account cannot open this workspace.");
  return response.json();
}
export async function unlockWorkspace(user: User, password: string, create: boolean): Promise<void> {
  const response = await fetch("/api/unlock", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${await user.getIdToken(true)}`},body:JSON.stringify({password,create}),cache:"no-store"});
  if(!response.ok)throw Error("Could not unlock. Check your password, or wait before trying again.");
  localStorage.removeItem("workspace-lock-pending");
}
export async function hasActiveSession(): Promise<boolean> {
  try {
    if(localStorage.getItem("workspace-lock-pending")) {
      const locked=await fetch("/api/lock",{method:"POST",headers:{"X-Workspace-Action":"lock"},cache:"no-store"});
      if(locked.ok)localStorage.removeItem("workspace-lock-pending");
      return false;
    }
    return (await fetch("/api/session",{cache:"no-store"})).ok;
  } catch { return false; }
}
