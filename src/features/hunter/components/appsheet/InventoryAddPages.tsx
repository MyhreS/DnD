import { useMemo, useState } from "react";
import { ITEMS } from "@/data/items";
import { useView4PageNavigation } from "../view4/view4PageNavigation";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CatalogItemForm, UniqueItemForm, type FoundItemDraft } from "./InventoryAddForms";

const EMPTY_ITEM: FoundItemDraft = {
  name: "",
  category: "Gear",
  carry: "Significant",
  weightLb: 0,
  note: "",
  attackBonus: "",
  damage: "",
  weaponNotes: "",
};

function CatalogInventoryPage() {
  const automation = useCharacterAutomation();
  const navigation = useView4PageNavigation();
  const [catalogId, setCatalogId] = useState("");
  const catalog = useMemo(() => ITEMS.filter((item) => item.category !== "Armor"), []);

  return <div className="appsheet-add-form v4-inventory-add-page">
    <CatalogItemForm
      catalog={catalog}
      catalogId={catalogId}
      setCatalogId={setCatalogId}
      onAdd={() => {
        if (!catalogId) return;
        automation.changeQty(catalogId, 1);
        navigation.returnToRoot();
      }}
    />
  </div>;
}

function UniqueInventoryPage() {
  const automation = useCharacterAutomation();
  const navigation = useView4PageNavigation();
  const [found, setFound] = useState<FoundItemDraft>(EMPTY_ITEM);

  return <div className="appsheet-add-form v4-inventory-add-page">
    <UniqueItemForm
      found={found}
      setFound={setFound}
      onCancel={navigation.popPage}
      onAdd={() => {
        automation.addCustomItem(found);
        navigation.returnToRoot();
      }}
    />
  </div>;
}

export function InventoryAddPageMenu() {
  const navigation = useView4PageNavigation();
  return <div className="appsheet-add-choices v4-inventory-add-menu">
    <button type="button" aria-label="Add from game catalogue" onClick={() => navigation.pushPage({
      id: "inventory-add-catalogue",
      title: "Game catalogue",
      eyebrow: "Add to inventory",
      content: <CatalogInventoryPage />,
    })}>
      <b>Add from game catalogue</b><span>Choose a handbook weapon, tool, or piece of gear.</span>
    </button>
    <button type="button" aria-label="Record a unique item" onClick={() => navigation.pushPage({
      id: "inventory-add-unique",
      title: "Unique item",
      eyebrow: "Add to inventory",
      content: <UniqueInventoryPage />,
    })}>
      <b>Record a unique item</b><span>Add a weapon or gear item found outside the handbook.</span>
    </button>
  </div>;
}
