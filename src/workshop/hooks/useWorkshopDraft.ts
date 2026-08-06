import { useEffect, useState } from "react";

const PREFIX = "dnd-workshop-draft:";
const fileDrafts = new Map<string, File[]>();

export function useWorkshopDraft(key: string) {
  const storageKey = `${PREFIX}${key}`;
  const [body, setBody] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      if (body) window.localStorage.setItem(storageKey, body);
      else window.localStorage.removeItem(storageKey);
    } catch {
      // Private browsing can disable storage. The in-memory draft still works.
    }
  }, [body, storageKey]);

  return { body, setBody, hasDraft: body.trim().length > 0 };
}

export function useWorkshopFileDraft(key: string) {
  const [files, setFilesState] = useState<File[]>(() => fileDrafts.get(key) ?? []);

  function setFiles(next: File[]) {
    setFilesState(next);
    if (next.length) fileDrafts.set(key, next);
    else fileDrafts.delete(key);
  }

  return { files, setFiles };
}
