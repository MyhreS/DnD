import { useCallback, useMemo, useState } from "react";
import { useOverlayFocus } from "../../hooks/useOverlayFocus";
import { AppSectionsExpanded } from "../appsheet/appSheetShared";
import { CharacterSheetBackButton } from "./CharacterSheetBackButton";
import type { CharacterSheetPanel } from "./CharacterSheetHome";
import { CharacterSheetPageLayout } from "./CharacterSheetPageLayout";
import { CharacterSheetPageNavigationContext, type CharacterSheetPageSpec } from "./characterSheetPageNavigation";

export function CharacterSheetPageStack({
  root,
  panel,
  onExit,
}: {
  root: CharacterSheetPageSpec;
  panel: CharacterSheetPanel;
  onExit: () => void;
}) {
  const pageRef = useOverlayFocus<HTMLElement>();
  const [{ pages, exitingId }, setStackState] = useState<{ pages: CharacterSheetPageSpec[]; exitingId: string | null }>({ pages: [], exitingId: null });
  const pushPage = useCallback((page: CharacterSheetPageSpec) => {
    setStackState((current) => ({ pages: [...current.pages, page], exitingId: null }));
  }, []);
  const finishPop = useCallback((id: string) => {
    setStackState((current) => ({
      pages: current.pages.at(-1)?.id === id ? current.pages.slice(0, -1) : current.pages,
      exitingId: current.exitingId === id ? null : current.exitingId,
    }));
  }, []);
  const popPage = useCallback(() => {
    setStackState((current) => {
      const page = current.pages.at(-1);
      if (!page || current.exitingId) return current;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? { pages: current.pages.slice(0, -1), exitingId: null }
        : { ...current, exitingId: page.id };
    });
  }, []);
  const returnToRoot = useCallback(() => {
    setStackState({ pages: [], exitingId: null });
  }, []);
  const goBack = pages.length > 0 ? popPage : onExit;
  const navigation = useMemo(() => ({ pushPage, popPage, returnToRoot }), [popPage, pushPage, returnToRoot]);
  const stack = [root, ...pages];
  const visibleIndex = exitingId ? Math.max(0, stack.length - 2) : stack.length - 1;
  const activeTitleId = `character-sheet-page-title-${visibleIndex}`;

  return <CharacterSheetPageNavigationContext.Provider value={navigation}>
    <section
      ref={pageRef}
      className="character-sheet-page-stack"
      data-panel={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={activeTitleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        goBack();
      }}
    >
      {stack.map((page, index) => {
        const isActive = index === visibleIndex;
        const isExiting = page.id === exitingId;
        const back = index === 0 ? onExit : popPage;
        return <div
          key={page.id}
          className={`character-sheet-page-layer${isActive ? " is-active" : " is-covered"}${isExiting ? " is-exiting" : ""}`}
          data-page-id={page.id}
          aria-hidden={!isActive}
          inert={!isActive}
          onAnimationEnd={(event) => {
            if (isExiting && event.animationName === "character-sheet-page-out") finishPop(page.id);
          }}
        >
          <CharacterSheetPageLayout
            className="character-sheet-page-shell"
            contentClassName="character-sheet-page-content"
            header={<header className="character-sheet-identity character-sheet-page-header">
              <div className="character-sheet-header-tools">
                <CharacterSheetBackButton onClick={back} />
              </div>
              <div className="character-sheet-page-heading">
                <h2 id={`character-sheet-page-title-${index}`}>{page.title}</h2>
              </div>
              <span className="character-sheet-page-header-balance" aria-hidden="true" />
            </header>}
          >
            <AppSectionsExpanded>{page.content}</AppSectionsExpanded>
          </CharacterSheetPageLayout>
        </div>;
      })}
    </section>
  </CharacterSheetPageNavigationContext.Provider>;
}
