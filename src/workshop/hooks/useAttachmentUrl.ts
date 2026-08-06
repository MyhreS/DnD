import { useEffect, useState } from "react";
import { workshopImageBlob } from "@/api/workshop";

export function useAttachmentUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void workshopImageBlob(path)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setUrl(objectUrl);
          setError(false);
        } else {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attempt, path]);
  return { url, error, retry: () => {
    setUrl(null);
    setError(false);
    setAttempt((current) => current + 1);
  } };
}
