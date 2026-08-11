import type { ReactNode } from "react";
import { useOverlayFocus } from "../../hooks/useOverlayFocus";
import { AppSectionsExpanded } from "../appsheet/appSheetShared";
import { View4Figure } from "./View4Figure";

export function View4Overlay({ title, eyebrow, classId, onClose, children }: { title: string; eyebrow: string; classId: string; onClose: () => void; children: ReactNode }) {
  const overlayRef = useOverlayFocus<HTMLElement>();
  return <section ref={overlayRef} className="v4-overlay" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={(event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }}>
    <View4Figure classId={classId} ghost />
    <header className="v4-overlay-header"><div><small>{eyebrow}</small><h2>{title}</h2></div><button type="button" aria-label={`Close ${title}`} onClick={onClose}>×</button></header>
    <div className="v4-overlay-content"><AppSectionsExpanded>{children}</AppSectionsExpanded></div>
  </section>;
}
