import type { ReactNode } from "react";
import { useDrawerDrag } from "../../hooks/useDrawerDrag";
import { useOverlayFocus } from "../../hooks/useOverlayFocus";
import { AppSectionsExpanded } from "../appsheet/appSheetShared";
import type { View4Panel } from "./View4CharacterSheet";

export function View4Overlay({ title, eyebrow, panel, onClose, children }: { title: string; eyebrow: string; panel: View4Panel; onClose: () => void; children: ReactNode }) {
  const overlayRef = useOverlayFocus<HTMLElement>();
  const { drawerRef, dragHandlers } = useDrawerDrag(onClose);
  return <section ref={overlayRef} className="v4-overlay" data-panel={panel} role="dialog" aria-modal="true" aria-labelledby="view4-drawer-title" tabIndex={-1} onKeyDown={(event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }}>
    <div ref={drawerRef} className="v4-drawer">
      <div className="v4-drawer-grabber" title="Drag down to close" {...dragHandlers}>
        <span className="v4-drawer-handle" aria-hidden="true" />
        <header className="v4-overlay-header"><small>{eyebrow}</small><h2 id="view4-drawer-title">{title}</h2></header>
      </div>
      <div className="v4-overlay-content"><AppSectionsExpanded>{children}</AppSectionsExpanded></div>
    </div>
  </section>;
}
