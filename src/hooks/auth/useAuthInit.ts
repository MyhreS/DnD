import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { maybePreview } from "@/dev/preview";
import { maybeTestLogin } from "@/dev/testLogin";

/** Boots auth: real Firebase listener, a dev test login, or a dev preview. */
export function useAuthInit(): void {
  const init = useAuthStore((s) => s.init);
  const setPreview = useAuthStore((s) => s.setPreview);

  useEffect(() => {
    const preview = maybePreview();
    if (preview) {
      setPreview(preview.user, preview.identity, preview.member);
      return;
    }
    const unsub = init();
    // DEV-only: if a ?testToken is present, sign in for real. The guard lets the
    // bundler strip this (and the whole testLogin module) from production builds.
    if (import.meta.env.DEV) void maybeTestLogin();
    return unsub;
  }, [init, setPreview]);
}
