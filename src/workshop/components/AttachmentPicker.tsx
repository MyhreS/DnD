import { useRef } from "react";
import { useFilePreview } from "@/workshop/hooks/useFilePreviews";
import { WORKSHOP_IMAGE_ACCEPT, validateWorkshopFiles } from "@/workshop/lib/attachments";

function SelectedFilePreview({ file, disabled, onRemove }: { file: File; disabled: boolean; onRemove: () => void }) {
  const url = useFilePreview(file);
  return (
    <div className="attachment-preview">
      {url ? <img src={url} alt="" /> : <span className="preview-loading" />}
      <span title={file.name}>{file.name}</span>
      <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${file.name}`}>×</button>
    </div>
  );
}

export function AttachmentPicker({
  files,
  disabled,
  compact = false,
  onChange,
  onError,
}: {
  files: File[];
  disabled: boolean;
  compact?: boolean;
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);

  function addFiles(selected: FileList | null) {
    const next = [...files, ...Array.from(selected ?? [])];
    const error = validateWorkshopFiles(next);
    if (error) onError(error);
    else {
      onChange(next);
      onError(null);
    }
    if (picker.current) picker.current.value = "";
  }

  function removeFile(index: number) {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
    onError(null);
  }

  return (
    <div className={`attachment-picker${compact ? " is-compact" : ""}`}>
      {files.length > 0 && (
        <div className="attachment-previews" data-testid="attachment-previews">
          {files.map((file, index) => <SelectedFilePreview key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} disabled={disabled} onRemove={() => removeFile(index)} />)}
        </div>
      )}
      <label className={`attach-button${compact ? " compact" : ""}${disabled ? " is-disabled" : ""}`}>
        <input ref={picker} type="file" accept={WORKSHOP_IMAGE_ACCEPT} multiple disabled={disabled} onChange={(event) => addFiles(event.target.files)} />
        <span aria-hidden>＋</span> {compact ? "Image" : "Add images"}{files.length ? ` (${files.length})` : ""}
      </label>
    </div>
  );
}
