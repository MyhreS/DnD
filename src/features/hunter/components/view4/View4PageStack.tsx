import { useCallback, useMemo, useState } from "react";
import { useOverlayFocus } from "../../hooks/useOverlayFocus";
import { AppSectionsExpanded } from "../appsheet/appSheetShared";
import { View4BackButton } from "./View4BackButton";
import type { View4Panel } from "./View4CharacterSheet";
import { View4PageLayout } from "./View4PageLayout";
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
  const [{ pages, exitingId }, setStackState] = useState<{ pages: View4PageSpec[]; exitingId: string | null }>({ pages: [], exitingId: null });
  const pushPage = useCallback((page: View4PageSpec) => {
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
  const activeTitleId = `view4-page-title-${visibleIndex}`;

  return <View4PageNavigationContext.Provider value={navigation}>
    <section
      ref={pageRef}
      className="v4-page-stack"
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
          className={`v4-page-layer${isActive ? " is-active" : " is-covered"}${isExiting ? " is-exiting" : ""}`}
          data-page-id={page.id}
          aria-hidden={!isActive}
          inert={!isActive}
          onAnimationEnd={(event) => {
            if (isExiting && event.animationName === "v4-page-out") finishPop(page.id);
          }}
        >
          <View4PageLayout
            className="v4-page-shell"
            contentClassName="v4-page-content"
            header={<header className="v4-identity v4-page-header">
              <div className="v4-header-tools">
                <View4BackButton onClick={back} />
              </div>
              <div className="v4-page-heading">
                <h2 id={`view4-page-title-${index}`}>{page.title}</h2>
              </div>
              <span className="v4-page-header-balance" aria-hidden="true" />
            </header>}
          >
            <AppSectionsExpanded>{page.content}</AppSectionsExpanded>
          </View4PageLayout>
        </div>;
      })}
    </section>
  </View4PageNavigationContext.Provider>;
}
