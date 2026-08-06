import { useCallback, useEffect, useState } from "react";
import { createEnemyTemplate, subscribeEnemyTemplates, updateEnemyTemplate } from "@/api/enemies";
import { previewEnemyTemplates } from "@/dev/preview";
import type { EnemyStats, EnemyTemplate } from "@/types";

export function useEnemyLibrary(uid: string | undefined, preview: boolean) {
  const [templates, setTemplates] = useState<EnemyTemplate[]>(() => preview ? previewEnemyTemplates() : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preview) return;
    if (!uid) {
      const timer = window.setTimeout(() => setTemplates([]), 0);
      return () => window.clearTimeout(timer);
    }
    return subscribeEnemyTemplates(uid, (next) => {
      setTemplates(next);
      setError(null);
    }, () => setError("Could not load the enemy library."));
  }, [preview, uid]);

  const create = useCallback(async (stats: EnemyStats): Promise<EnemyTemplate | null> => {
    setBusy(true);
    setError(null);
    try {
      const now = Date.now();
      if (preview) {
        const template = { ...stats, id: `preview-enemy-${now}`, archived: false, createdAt: now, updatedAt: now };
        setTemplates((current) => [...current, template].sort((a, b) => a.name.localeCompare(b.name)));
        return template;
      }
      if (!uid) return null;
      const id = await createEnemyTemplate(uid, stats);
      return { ...stats, id, archived: false, createdAt: now, updatedAt: now };
    } catch (reason) {
      console.error("Could not create the enemy template.", reason);
      setError("Could not save the enemy.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [preview, uid]);

  const update = useCallback(async (
    template: EnemyTemplate,
    patch: Partial<EnemyStats> & { archived?: boolean },
  ): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      if (preview) {
        setTemplates((current) => current.map((item) => item.id === template.id
          ? { ...item, ...patch, updatedAt: Date.now() }
          : item).sort((a, b) => a.name.localeCompare(b.name)));
      } else if (uid) {
        await updateEnemyTemplate(uid, template.id, patch);
      } else return false;
      return true;
    } catch (reason) {
      console.error("Could not update the enemy template.", reason);
      setError("Could not update the enemy.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [preview, uid]);

  return { templates, busy, error, create, update };
}
