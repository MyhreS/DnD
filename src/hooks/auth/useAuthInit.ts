import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { maybePreview } from "@/dev/preview";

/** Boots auth: real Firebase listener, or a dev preview session. */
export function useAuthInit(): void {
  const init = useAuthStore((s) => s.init);
  const setPreview = useAuthStore((s) => s.setPreview);

  useEffect(() => {
    const preview = maybePreview();
    if (preview) {
      setPreview(preview.user, preview.identity, preview.member);
      return;
    }
    return init();
  }, [init, setPreview]);
}
