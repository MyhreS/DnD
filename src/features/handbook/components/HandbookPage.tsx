import { useSearchParams } from "react-router-dom";
import { AsyncButton } from "@/components/AsyncButton";
import { downloadHandbookPdf } from "../lib/handbookPdf";
import { useHandbookIntent } from "../hooks/useHandbookIntent";
import { useHandbookView } from "../hooks/useHandbookView";
import { useHandbookSearch } from "../hooks/useHandbookSearch";
import { HANDBOOK_TABS, type HandbookHit, type HandbookTab } from "../lib/handbookIndex";
import { HandbookSearch } from "./HandbookSearch";
import { ChaptersTab } from "./ChaptersTab";
import { ClassesTab } from "./ClassesTab";
import { RitesTab } from "./RitesTab";
import { BackgroundsTab } from "./BackgroundsTab";
import { FeatsTab } from "./FeatsTab";
import { ArmoryTab } from "./ArmoryTab";

const TAB_LABEL: Record<HandbookTab, string> = {
  rules: "Chapters",
  classes: "Classes",
  backgrounds: "Backgrounds",
  feats: "Feats",
  rites: "Rites",
  armory: "Armory",
};

export function HandbookPage() {
  // Deep links (`?tab=…&chapter=…&section=…`) pick the landing spot — the
  // sheet's info dots open the handbook exactly where a topic is covered.
  const intent = useHandbookIntent();
  const [, setParams] = useSearchParams();
  // Session memory: plain /handbook restores where the reader left off (tab,
  // open cards, search, scroll); explicit deep links override + replace it.
  const { tab, setTab, openChapter, setOpenChapter, openClass, setOpenClass } = useHandbookView();
  const search = useHandbookSearch();

  // A search hit jumps into the content: it becomes the deep-link params, so
  // useHandbookView switches tab + opens the card, and for chapter sections
  // useScrollToSection scrolls + pulses.
  function openHit(hit: HandbookHit) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        next.delete("chapter");
        next.delete("section");
        next.delete("item");
        next.set("tab", hit.tab);
        if (hit.chapter && hit.section) {
          next.set("chapter", hit.chapter);
          next.set("section", hit.section);
        }
        if (hit.item) next.set("item", hit.item);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="reading">
      <p className="eyebrow">The Codex</p>
      <h1 className="page-title">Player's Handbook</h1>
      <p className="page-intro">Everything you need to play Catacombs &amp; Starspawns.</p>

      <HandbookSearch search={search} onOpen={openHit} />

      {!search.active && (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {HANDBOOK_TABS.map((t) => (
              <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
                {TAB_LABEL[t]}
              </TabButton>
            ))}
          </div>

          {tab === "rules" && (
            <ChaptersTab
              key={`${intent.chapter}:${intent.section}`}
              focusChapter={intent.chapter}
              focusSection={intent.section}
              open={openChapter}
              onOpen={setOpenChapter}
            />
          )}
          {tab === "classes" && (
            <ClassesTab
              key={intent.item}
              focusClass={intent.item}
              open={openClass}
              onOpen={setOpenClass}
            />
          )}
          {tab === "backgrounds" && <BackgroundsTab />}
          {tab === "feats" && <FeatsTab />}
          {tab === "rites" && <RitesTab />}
          {tab === "armory" && <ArmoryTab />}
        </>
      )}

      <div className="rule-ornament">◆</div>
      <AsyncButton
        className="btn btn-ghost"
        pendingText="Preparing…"
        showDone={false}
        onClick={downloadHandbookPdf}
      >
        Download the full handbook (PDF)
      </AsyncButton>
      <p className="faint center" style={{ fontSize: "0.76rem", marginTop: 8 }}>
        Saves the PDF so you can read it in Files / your PDF app.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip selectable${active ? " selected" : ""}`}
      style={{ flex: 1, justifyContent: "center", padding: "9px 8px" }}
    >
      {children}
    </button>
  );
}
