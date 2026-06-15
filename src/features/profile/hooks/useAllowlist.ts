import { useCallback, useEffect, useState } from "react";
import {
  listAllowlist,
  addToAllowlist,
  removeFromAllowlist,
  type NewMember,
} from "@/api/allowlist";
import type { AllowlistMember } from "@/types";

export function useAllowlist(enabled: boolean) {
  const [members, setMembers] = useState<AllowlistMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMembers(await listAllowlist());
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Could not load the allowlist.");
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const add = useCallback(
    async (member: NewMember, addedBy: string) => {
      await addToAllowlist(member, addedBy);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (email: string) => {
      await removeFromAllowlist(email);
      await refresh();
    },
    [refresh],
  );

  return { members, error, add, remove };
}
