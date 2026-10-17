import type { BloodvialPurity } from "@/types";

export type CatalogCategory = "Weapon" | "Ammunition" | "Tool" | "Gear" | "Consumable" | "Valuable";

/** Line-art icons for the game catalogue, one per item category. */
export function CatalogCategoryIcon({ category }: { category: CatalogCategory | "All" | "Firearm" }) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" className="catalog-icon">
    {category === "All" && <><rect x="5" y="5" width="9" height="9" rx="2" /><rect x="18" y="5" width="9" height="9" rx="2" /><rect x="5" y="18" width="9" height="9" rx="2" /><rect x="18" y="18" width="9" height="9" rx="2" /></>}
    {category === "Weapon" && <><path d="M24 4h4v4L14 22l-4-4L24 4Z" /><path d="m8 16 8 8M6 22l4 4M4 28l3-3" /></>}
    {category === "Firearm" && <><path d="M3 12h22l3-3v6h-6l-2 3h-5l-1 6H9l1-6H6l-3-3v-3Z" /><path d="M14 18v-2h4" /></>}
    {category === "Ammunition" && <><path d="M8 26V12c0-3 1.5-6 3-7 1.5 1 3 4 3 7v14H8Z" /><path d="M18 26V14c0-3 1.5-6 3-7 1.5 1 3 4 3 7v12h-6Z" /><path d="M8 21h6M18 21h6" /></>}
    {category === "Tool" && <><path d="M20 4a6 6 0 0 0-5.6 8.2L4 22.6V28h5.4l10.4-10.4A6 6 0 0 0 28 12l-4 4-4-1-1-4 4-4a6 6 0 0 0-3-3Z" /></>}
    {category === "Gear" && <><path d="M7 11h18l-2 17H9L7 11Z" /><path d="M11 11V8a5 5 0 0 1 10 0v3" /><path d="M11 17h10" /></>}
    {category === "Consumable" && <><path d="M12 4h8M13 4v7l-6 11a4 4 0 0 0 3.5 6h11a4 4 0 0 0 3.5-6l-6-11V4" /><path d="M10 20h12" /></>}
    {category === "Valuable" && <><path d="M8 6h16l5 7-13 15L3 13l5-7Z" /><path d="M3 13h26M12 6l4 22 4-22" /></>}
  </svg>;
}

/** A Bloodvial drawn as a drop of blood, tinted by its purity. */
export function BloodvialIcon({ purity }: { purity: BloodvialPurity }) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" className={`catalog-icon catalog-blood is-${purity}`}>
    <path d="M16 3C12 9 8 14 8 19a8 8 0 0 0 16 0c0-5-4-10-8-16Z" />
    <path d="M12 20a4 4 0 0 0 4 4" />
  </svg>;
}
