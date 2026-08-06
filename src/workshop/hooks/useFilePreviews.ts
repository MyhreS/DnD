import { useEffect, useState } from "react";

export function useFilePreview(file: File): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    const next = URL.createObjectURL(file);
    queueMicrotask(() => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(next);
    };
  }, [file]);

  return url;
}
