import type { ReactNode } from "react";

// The six idle hunters drawn in the sheet's own line-art grammar (see
// HunterFigure.tsx): #211d17 ink, round caps, translucent white garment fills.
// Each figure is a compact 120×150 doodle; the gentle idle motion comes from
// CSS keyframes on the cf-* group classes (papersheet.css). ClassFigure.tsx
// maps class ids onto these.

const W = "rgba(255,255,255,.4)";
const W2 = "rgba(255,255,255,.55)";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 120 150" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="144" rx="28" ry="3.5" fill="rgba(33,29,23,.10)" />
      <g stroke="#211d17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

/** Brute — a wall of muscle leaning on a great warhammer, chest heaving. */
export function Brute() {
  return (
    <Frame>
      <g className="cf-bob">
        <g className="cf-sway-b">
          <path d="M97 68 L 97 120" />
          <path d="M84 118 L 111 118 L 111 137 L 84 137 Z" fill={W2} />
        </g>
        <g className="cf-breathe">
          <path d="M50 24 C 50 13, 70 13, 70 24 L 68 34 Q 60 40 52 34 Z" fill={W} />
          <path d="M36 46 Q 60 39 84 46 L 88 90 Q 60 98 32 90 Z" fill={W} />
          <path d="M34 76 L 86 76" strokeWidth="2.2" />
          <path d="M38 48 C 30 60, 27 72, 28 84" />
          <path d="M82 48 C 90 56, 95 62, 97 68" />
        </g>
        <path d="M50 94 L 48 128" />
        <path d="M72 94 L 74 128" />
        <path d="M48 128 L 45 140 L 59 140 L 56 128" fill={W} />
        <path d="M74 128 L 77 140 L 63 140 L 66 128" fill={W} />
      </g>
    </Frame>
  );
}

/** Scout — hooded, bow in hand, waving hello. */
export function Scout() {
  return (
    <Frame>
      <g className="cf-bob">
        <path d="M28 50 C 14 72, 14 96, 28 116" />
        <path d="M28 50 L 28 116" strokeWidth="1.6" />
        <path d="M48 34 C 44 14, 76 14, 72 34 Q 60 42 48 34 Z" fill={W} />
        <path d="M54 31 Q 60 35 66 31" strokeWidth="2.2" />
        <path d="M70 40 L 82 24" />
        <path d="M78 28 L 86 21 M 76 33 L 85 27" strokeWidth="2.2" />
        <path d="M46 44 C 44 64, 42 84, 40 104" />
        <path d="M74 44 C 76 64, 78 84, 80 104" />
        <path d="M46 44 Q 60 39 74 44" />
        <path d="M40 104 Q 60 111 80 104" />
        <path d="M44 78 L 76 78" strokeWidth="2.2" />
        <path d="M46 46 C 38 58, 32 70, 29 82" />
        <g className="cf-wave">
          <path d="M74 48 C 84 44, 92 34, 96 24" />
          <circle cx="97" cy="20" r="3.5" fill={W} />
        </g>
        <path d="M52 106 L 50 130" />
        <path d="M68 106 L 70 130" />
        <path d="M50 130 L 47 141 L 60 141 L 57 130" fill={W} />
        <path d="M70 130 L 73 141 L 60 141" fill={W} />
      </g>
    </Frame>
  );
}

/** Stalker — wide-brim hat, dagger low, coat-tails stirring. */
export function Stalker() {
  return (
    <Frame>
      <g className="cf-bob">
        <path d="M50 22 C 51 9, 69 9, 70 22" fill={W} />
        <path d="M38 23 C 48 19, 72 19, 82 23 C 72 29, 48 29, 38 23 Z" fill={W2} />
        <path d="M53 34 Q 60 39 67 34" strokeWidth="2.2" />
        <path d="M50 42 Q 60 48 70 42 L 71 50 Q 60 56 49 50 Z" fill={W} />
        <g className="cf-sway">
          <path d="M42 84 C 39 93, 37 102, 36 110 Q 60 118 84 110 C 83 102 81 93 78 84 Z" fill={W} />
        </g>
        <path d="M44 54 C 41 64, 43 74, 42 84" />
        <path d="M76 54 C 79 64, 77 74, 78 84" />
        <path d="M44 54 Q 60 49 76 54" />
        <path d="M54 56 L 60 68 L 66 56" strokeWidth="2.2" />
        <path d="M60 68 L 60 82" strokeWidth="2.2" />
        <path d="M42 84 L 78 84" strokeWidth="2.2" />
        <path d="M44 56 C 37 66, 33 76, 32 86" />
        <path d="M76 56 C 83 64, 87 72, 88 80" />
        <path d="M83 86 L 93 82" strokeWidth="2.2" />
        <path d="M88 84 L 96 102" strokeWidth="2.4" />
        <path d="M52 112 L 50 132" />
        <path d="M68 112 L 70 132" />
        <path d="M50 132 L 47 142 L 60 142 L 57 132" fill={W} />
        <path d="M70 132 L 73 142 L 60 142" fill={W} />
      </g>
    </Frame>
  );
}

/** Deepcaller — robed and hooded, orb-staff in hand, whispers coiling up. */
export function Deepcaller() {
  return (
    <Frame>
      <g className="cf-float">
        <path d="M88 22 L 88 128" />
        <circle cx="88" cy="15" r="5" fill={W2} />
        <path d="M46 36 C 42 12, 78 12, 74 36 Q 60 45 46 36 Z" fill={W} />
        <path d="M53 31 Q 60 36 67 31" strokeWidth="2.2" />
        <path d="M46 42 C 40 70, 36 100, 33 128 Q 60 136 87 128 C 84 100 80 70 74 42 Q 60 37 46 42 Z" fill={W} />
        <path d="M44 78 Q 60 84 76 78" strokeWidth="2.2" />
        <path d="M72 52 C 78 56, 83 59, 87 62" />
        <path d="M46 52 C 42 62, 41 72, 42 82" />
      </g>
      <g strokeWidth="2.6">
        <path className="cf-tent" d="M28 138 C 23 128, 32 120, 25 106" />
        <path className="cf-tent d2" d="M60 141 C 57 133, 64 128, 59 118" />
        <path className="cf-tent d3" d="M92 138 C 97 128, 88 120, 95 106" />
      </g>
    </Frame>
  );
}

/** Bloodbound — bare-headed berserker, axe held ready across the hips. */
export function Bloodbound() {
  return (
    <Frame>
      <g className="cf-bob">
        <path d="M50 26 C 50 15, 70 15, 70 26 L 68 37 Q 60 42 52 37 Z" fill={W} />
        <path d="M51 17 L 47 10 M 57 14 L 55 7 M 63 14 L 65 7 M 69 17 L 73 10" strokeWidth="2.2" />
        <g className="cf-breathe">
          <path d="M38 48 Q 60 42 82 48 L 86 92 Q 60 100 34 92 Z" fill={W} />
          <path d="M52 56 Q 60 60 68 56" strokeWidth="2.2" />
          <path d="M36 80 L 84 80" strokeWidth="2.2" />
        </g>
        <path d="M40 50 C 36 62, 38 74, 45 84" />
        <path d="M80 50 C 78 54, 74 58, 71 61" />
        <g className="cf-sway-b">
          <path d="M46 86 L 94 34" />
          <path d="M90 24 C 104 26, 110 40, 102 51 C 97 40 92 34 84 38 Z" fill={W2} />
        </g>
        <path d="M50 96 L 45 130" />
        <path d="M70 96 L 75 130" />
        <path d="M45 130 L 42 141 L 56 141 L 53 130" fill={W} />
        <path d="M75 130 L 78 141 L 64 141 L 67 130" fill={W} />
      </g>
    </Frame>
  );
}

/** Warden — kettle helm, tower shield planted, pennant on the spear. */
export function Warden() {
  return (
    <Frame>
      <g transform="translate(-5 0)">
        <g className="cf-bob">
          <path d="M84 20 L 84 132" />
          <path d="M80 20 L 84 6 L 88 20 Z" fill={W2} />
          <g className="cf-pennant">
            <path d="M85 24 L 106 30 L 85 40 Z" fill={W} />
          </g>
          <path d="M51 22 C 52 12, 68 12, 69 22" fill={W} />
          <path d="M42 23 C 51 20, 69 20, 78 23 C 69 28, 51 28, 42 23 Z" fill={W2} />
          <path d="M54 33 Q 60 37 66 33" strokeWidth="2.2" />
          <path d="M48 42 Q 62 38 76 42 C 78 60 79 76 78 92 Q 70 96 62 95" />
          <path d="M76 46 C 80 51, 82 55, 83 60" />
          <path d="M64 97 L 62 132" />
          <path d="M76 94 L 78 130" />
          <path d="M62 132 L 59 142 L 72 142 L 69 132" fill={W} />
          <path d="M78 130 L 81 141 L 68 141" fill={W} />
          <path d="M40 50 C 29 50, 24 58, 24 70 C 24 92 32 108 40 114 C 48 108 56 92 56 70 C 56 58 51 50 40 50 Z" fill={W2} />
          <path d="M40 60 L 40 98 M 30 74 L 50 74" strokeWidth="2.2" />
        </g>
      </g>
    </Frame>
  );
}
