import { useCallback, type ClipboardEvent } from "react";
import { validateWorkshopFiles, workshopClipboardImages } from "@/workshop/lib/attachments";

export function useWorkshopImagePaste({
  files,
  disabled,
  onChange,
  onError,
}: {
  files: File[];
  disabled: boolean;
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
}) {
  return useCallback((event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const pasted = workshopClipboardImages(event.clipboardData);
    if (pasted.length === 0) return;
    const next = [...files, ...pasted];
    const error = validateWorkshopFiles(next);
    if (error) {
      onError(error);
      return;
    }
    onChange(next);
    onError(null);
  }, [disabled, files, onChange, onError]);
}
