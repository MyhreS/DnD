import type { ReactNode } from "react";

/** One stat tile on an item page: a small label, the big value, a caption. */
export function ItemStat({ label, caption, children }: { label: string; caption?: string; children: ReactNode }) {
  return <div className="item-detail-stat">
    <small>{label}</small>
    <strong>{children}</strong>
    {caption && <span>{caption}</span>}
  </div>;
}
