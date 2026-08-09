import { useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Item } from "@/types";
import { useInventoryAddDialog } from "../../hooks/useInventoryAddDialog";
import { CatalogItemForm, UniqueItemForm, type FoundItemDraft } from "./InventoryAddForms";

type AddPath = "choose" | "library" | "unique";

export function InventoryAddDialog({
  triggerRef,
  catalog,
  catalogId,
  setCatalogId,
  found,
  setFound,
  addCatalogItem,
  addUniqueItem,
  onClose,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  catalog: Item[];
  catalogId: string;
  setCatalogId: (id: string) => void;
  found: FoundItemDraft;
  setFound: Dispatch<SetStateAction<FoundItemDraft>>;
  addCatalogItem: () => void;
  addUniqueItem: () => void;
  onClose: () => void;
}) {
  const [path, setPath] = useState<AddPath>("choose");
  const dialogRef = useRef<HTMLDivElement>(null);
  useInventoryAddDialog(dialogRef, triggerRef, onClose, path);

  const title = path === "library" ? "Add from rules library" : path === "unique" ? "Record a unique item" : "Add to inventory";

  return (
    <div className="appsheet-add-backdrop" data-testid="appsheet-add-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="appsheet-add-dialog" role="dialog" aria-modal="true" aria-labelledby="appsheet-add-title">
        <header>
          <h2 id="appsheet-add-title">{title}</h2>
          <button type="button" className="appsheet-add-close" aria-label="Close add item menu" onClick={onClose}>×</button>
        </header>
        {path === "choose" && (
          <div className="appsheet-add-choices">
            <button type="button" aria-label="Add from rules library" data-dialog-autofocus onClick={() => setPath("library")}><b>Add from rules library</b><span>Choose a handbook weapon, tool, or piece of gear.</span></button>
            <button type="button" aria-label="Record a unique item" onClick={() => setPath("unique")}><b>Record a unique item</b><span>Add a weapon or gear item found outside the handbook.</span></button>
          </div>
        )}
        {path === "library" && (
          <div className="appsheet-add-form">
            <CatalogItemForm catalog={catalog} catalogId={catalogId} setCatalogId={setCatalogId} onAdd={() => { addCatalogItem(); onClose(); }} />
            <button type="button" className="appsheet-secondary-action appsheet-add-back" onClick={() => setPath("choose")}>Back</button>
          </div>
        )}
        {path === "unique" && (
          <div className="appsheet-add-form">
            <UniqueItemForm found={found} setFound={setFound} onCancel={() => setPath("choose")} onAdd={() => { addUniqueItem(); onClose(); }} />
          </div>
        )}
      </div>
    </div>
  );
}
