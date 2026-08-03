import { useState } from "react";
import { RITES, RITE_TYPES } from "@/data/rites";
import type { Rite, RiteType } from "@/types";
import { ChevronIcon } from "@/components/icons";
import { AsyncButton } from "@/components/AsyncButton";
import { openDocument } from "../lib/handbookPdf";
import { WHISPERS_PDF_PATH } from "@/data/handbook";

type Filter = "all" | RiteType;

export function RitesTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const shown = RITES.filter((r) => filter === "all" || r.type === filter);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="muted" style={{ fontSize: "0.92rem", marginTop: 0 }}>
        The Book of the Deepcaller — Rites and Whispers. Whispers cost no Strain and
        cause no Madness; Rites are fuelled by Strain and paid for in Madness.
      </p>

      <AsyncButton
        className="btn btn-ghost"
        pendingText="Preparing…"
        showDone={false}
        onClick={() => openDocument(WHISPERS_PDF_PATH, "Whispers.pdf", "Whispers")}
      >
        Open the Whispers (PDF)
      </AsyncButton>

      <div className="chip-row">
        <button
          type="button"
          className={`chip selectable${filter === "all" ? " selected" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {RITE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip selectable${filter === t ? " selected" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {shown.map((rite) => (
          <RiteRow
            key={rite.id}
            rite={rite}
            isOpen={open === rite.id}
            onToggle={() => setOpen(open === rite.id ? null : rite.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RiteRow({
  rite,
  isOpen,
  onToggle,
}: {
  rite: Rite;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, padding: 14, color: "var(--ink)" }}
      >
        <div className="row between" style={{ gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{rite.name}</div>
            <div className="gold" style={{ fontSize: "0.78rem" }}>
              {rite.whisper ? "Whisper" : `Level ${rite.level}`} · {rite.type}
            </div>
          </div>
          <ChevronIcon
            width={18}
            height={18}
            style={{
              transform: isOpen ? "rotate(90deg)" : "none",
              transition: "transform 0.2s ease",
              color: "var(--gold-dim)",
              flex: "none",
            }}
          />
        </div>
      </button>
      {isOpen && (
        <div className="fade-in" style={{ padding: "0 14px 14px" }}>
          <div className="meta-line">
            <Meta label="Performing" value={rite.performing} />
            <Meta label="Range" value={rite.range} />
            <Meta label="Duration" value={rite.duration} />
          </div>
          {rite.special && (
            <p className="faint" style={{ fontSize: "0.82rem", marginTop: 8, marginBottom: 0 }}>
              <strong>Special:</strong> {rite.special}
            </p>
          )}
          <p className="muted" style={{ fontSize: "0.92rem", marginTop: 8, whiteSpace: "pre-wrap" }}>
            {rite.text}
          </p>
          {rite.upgrade && (
            <p className="muted" style={{ fontSize: "0.88rem", marginBottom: 0 }}>
              <strong className="gold">{rite.whisper ? "Whisper Upgrade. " : "Higher-Level Strain. "}</strong>
              {rite.upgrade}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: "0.8rem" }}>
      <span className="faint" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.68rem" }}>
        {label}{" "}
      </span>
      {value}
    </span>
  );
}
