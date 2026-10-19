import { useEffect, useState } from "react";
import { getWorkspaceAccess, type WorkspaceAccess } from "@/api/secureWorkspace";
import { useAuthStore } from "@/features/auth/store/authStore";
export function useWorkspaceAccess() {
  const uid = useAuthStore(s => s.user?.uid);
  const preview = useAuthStore(s => s.viewAs);
  const [entry, setEntry] = useState<{uid:string;access:WorkspaceAccess}|null>(null);
  useEffect(() => {
    let active = true;
    if (uid && !preview) void getWorkspaceAccess().then(result => {if(active)setEntry({uid,access:result});}).catch(() => {if(active)setEntry({uid,access:{available:false}});});
    return () => { active=false; };
  }, [uid, preview]);
  return uid && !preview && entry?.uid===uid ? entry.access : {available:false} as const;
}
