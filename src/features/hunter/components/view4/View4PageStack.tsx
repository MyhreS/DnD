import { useCallback, useMemo, useState } from "react";
import { useOverlayFocus } from "../../hooks/useOverlayFocus";
import { AppSectionsExpanded } from "../appsheet/appSheetShared";
import type { View4Panel } from "./View4CharacterSheet";
import { View4PageNavigationContext, type View4PageSpec } from "./view4PageNavigation";

export function View4PageStack({
  root,
  panel,
  onExit,
}: {
  root: View4PageSpec;
  panel: View4Panel;
  onExit: () => void;
}) {
  const pageRef = useOverlayFocus<HTMLElement>();
  const [pages, setPages] = useState<View4PageSpec[]>([]);
  const activePage = pages.at(-1) ?? root;
  const pushPage = useCallback((page: View4PageSpec) => setPages((current) => [...current, page]), []);
  const popPage = useCallback(() => setPages((current) => current.slice(0, -1)), []);
  const returnToRoot = useCallback(() => setPages([]), []);
  const goBack = pages.length > 0 ? popPage : onExit;
  const navigation = useMemo(() => ({ pushPage, popPage, returnToRoot }), [popPage, pushPage, returnToRoot]);

  return <View4PageNavigationContext.Provider value={navigation}>
    <section
      ref={pageRef}
      className="v4-page-stack"
      data-panel={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view4-page-title"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        goBack();
      }}
    >
      <div key={activePage.id} className="v4-page-shell">
        <header className="v4-identity v4-page-header">
          <div className="v4-header-tools">
            <button type="button" className="character-sheet-back" onClick={goBack} aria-label="Back">
              <span aria-hidden="true">←</span><span>Back</span>
            </button>
          </div>
          <div className="v4-page-heading">
            <small>{activePage.eyebrow}</small>
            <h2 id="view4-page-title">{activePage.title}</h2>
          </div>
          <span className="v4-page-header-balance" aria-hidden="true" />
        </header>
        <div className="v4-page-content">
          <AppSectionsExpanded>{activePage.content}</AppSectionsExpanded>
        </div>
      </div>
    </section>
  </View4PageNavigationContext.Provider>;
}
