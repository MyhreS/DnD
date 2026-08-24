import { useEffect, useRef, type FormEvent } from "react";
import "../character-editor.css";

export function CharacterDeleteDialog({
  characterName,
  deletePhrase,
  confirmation,
  deleting,
  error,
  onConfirmationChange,
  onCancel,
  onConfirm,
}: {
  characterName: string;
  deletePhrase: string;
  confirmation: string;
  deleting: boolean;
  error: string;
  onConfirmationChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const matches = confirmation.trim() === deletePhrase;
  const displayName = characterName || "this unnamed character";

  return (
    <div
      className="character-delete-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        className="character-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-delete-title"
        aria-describedby="character-delete-description"
        onSubmit={onConfirm}
      >
        <h2 id="character-delete-title">Delete character?</h2>
        <p id="character-delete-description">
          <strong>{displayName}</strong> will disappear from your hunter list and move to the recovery archive.
        </p>
        <label htmlFor="character-delete-confirmation">
          Type <strong>{deletePhrase}</strong> to confirm
        </label>
        <input
          ref={inputRef}
          id="character-delete-confirmation"
          data-testid="character-delete-confirmation"
          value={confirmation}
          disabled={deleting}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onConfirmationChange(event.target.value)}
        />
        {error && <p className="character-delete-error" role="alert">{error}</p>}
        <div className="character-delete-actions">
          <button type="button" className="character-delete-cancel" disabled={deleting} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="character-delete-confirm" disabled={!matches || deleting}>
            {deleting ? "Deleting…" : "Delete character"}
          </button>
        </div>
      </form>
    </div>
  );
}
