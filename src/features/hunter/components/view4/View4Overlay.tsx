import type { ReactNode } from "react";
import { AppSectionsExpanded } from "../appsheet/appSheetShared";
import { View4Figure } from "./View4Figure";

export function View4Overlay({ title, eyebrow, classId, onClose, children }: { title: string; eyebrow: string; classId: string; onClose: () => void; children: ReactNode }) {
  return <section className="v4-overlay" role="dialog" aria-label={title} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <View4Figure classId={classId} ghost />
    <header className="v4-overlay-header"><div><small>{eyebrow}</small><h2>{title}</h2></div><button type="button" aria-label={`Close ${title}`} onClick={onClose}>×</button></header>
    <div className="v4-overlay-content"><AppSectionsExpanded>{children}</AppSectionsExpanded></div>
  </section>;
}
