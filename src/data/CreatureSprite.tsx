import type { SVGProps } from "react";

// Badass fantasy figures — dark silhouettes with gold weapons + glowing eyes.
const BODY = "#2b2733";
const BODY2 = "#3a3543";
const GOLD = "#c9a45a";
const BLOOD = "#d6202a";
const STONE = "#6b6675";
const PALE = "#cfc8d6";

function Eyes({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <g>
      <circle cx={x1} cy={y} r={1.4} fill={BLOOD} />
      <circle cx={x2} cy={y} r={1.4} fill={BLOOD} />
      <circle cx={x1} cy={y} r={2.6} fill={BLOOD} opacity={0.28} />
      <circle cx={x2} cy={y} r={2.6} fill={BLOOD} opacity={0.28} />
    </g>
  );
}

/** Renders a creature id as a 48×48 SVG figure. */
export function CreatureSprite({
  id,
  size = 48,
  ...rest
}: { id: string; size?: number } & SVGProps<SVGSVGElement>) {
  const p = { width: size, height: size, viewBox: "0 0 48 48", xmlns: "http://www.w3.org/2000/svg", ...rest };
  switch (id) {
    case "reaper":
      return (
        <svg {...p}>
          <path d="M34 5 L30 44" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <path d="M34 5 q-11 -1 -14 8" stroke={GOLD} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M24 8c-7 0-10 6-11 14-1 8-3 14-6 22h34c-3-8-5-14-6-22-1-8-4-14-11-14z" fill={BODY} />
          <ellipse cx="24" cy="19" rx="5.2" ry="6.4" fill="#0a0a0c" />
          <Eyes x1={21.6} x2={26.4} y={19} />
        </svg>
      );
    case "dark-angel":
      return (
        <svg {...p}>
          <path d="M22 20C9 11 3 16 5 27c7-5 11-3 17 3z" fill={BODY2} />
          <path d="M26 20c13-9 19-4 17 7-7-5-11-3-17 3z" fill={BODY2} />
          <ellipse cx="24" cy="7" rx="6" ry="2" fill="none" stroke={GOLD} strokeWidth="1.4" />
          <circle cx="24" cy="14" r="4" fill={BODY} />
          <path d="M20 18h8l-1.5 14h-5z" fill={BODY} />
          <path d="M24 32v11M21 33h6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <Eyes x1={22.3} x2={25.7} y={14} />
        </svg>
      );
    case "demon":
      return (
        <svg {...p}>
          <path d="M18 9 L14 2 L21 8zM30 9 L34 2 L27 8z" fill="#6e0c0f" />
          <path d="M17 11q7-5 14 0q2 7-7 12q-9-5-7-12z" fill="#8b1a1a" />
          <path d="M13 24q11-5 22 0l-4 17H17z" fill="#6e1414" />
          <path d="M19 21l3 2-3 2zM29 21l-3 2 3 2z" fill={GOLD} />
          <path d="M21 16q3 2 6 0" stroke="#3a0a0c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "knight":
      return (
        <svg {...p}>
          <path d="M24 5l-2 5h4z" fill={BLOOD} />
          <path d="M18 11q6-4 12 0v8q-6 4-12 0z" fill={STONE} />
          <rect x="22" y="14" width="4" height="4" rx="1" fill="#0a0a0c" />
          <path d="M16 22q8-4 16 0l-2 18H18z" fill={BODY} />
          <path d="M33 20l4 22" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M30 20h7" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M11 26q4-2 7 0v8q-3 2-7 0z" fill={STONE} />
        </svg>
      );
    case "valkyrie":
      return (
        <svg {...p}>
          <path d="M19 10L9 6l9 6zM29 10l10-4-9 6z" fill={PALE} />
          <circle cx="24" cy="13" r="4.5" fill={STONE} />
          <path d="M19 23q5-4 10 0l-2 17h-6z" fill={BODY} />
          <path d="M30 4v34" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <path d="M30 4l3 5h-6z" fill={GOLD} />
          <Eyes x1={22.2} x2={25.8} y={13} />
        </svg>
      );
    case "gargoyle":
      return (
        <svg {...p}>
          <path d="M16 24C4 18 2 26 7 32c4-3 7-2 10 1z" fill={STONE} />
          <path d="M32 24c12-6 14 2 9 8-4-3-7-2-10 1z" fill={STONE} />
          <path d="M18 12l-3-5 6 4zM30 12l3-5-6 4z" fill="#4f4a58" />
          <path d="M16 16q8-6 16 0q1 8-8 12q-9-4-8-12z" fill={STONE} />
          <path d="M14 28q10-4 20 0l-3 12H17z" fill="#5a5563" />
          <Eyes x1={21} x2={27} y={18} />
        </svg>
      );
    case "wraith":
      return (
        <svg {...p}>
          <path d="M24 6c-8 0-13 6-13 16 0 8-2 14-4 20 2 0 3-3 4-3s2 3 3 3 2-3 3-3 2 3 3 3 2-3 3-3 2 3 3 3 2-3 3-3 2 3 4 3c-2-6-4-12-4-20 0-10-5-16-13-16z" fill={BODY} opacity="0.94" />
          <path d="M11 24q-5 3-6 9 5-2 7-5zM37 24q5 3 6 9-5-2-7-5z" fill={BODY2} />
          <Eyes x1={21.5} x2={26.5} y={18} />
        </svg>
      );
    case "sorcerer":
      return (
        <svg {...p}>
          <path d="M34 6v38" stroke={BODY2} strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="6" r="4" fill={GOLD} />
          <circle cx="34" cy="6" r="6.5" fill={GOLD} opacity="0.25" />
          <path d="M24 8c-6 0-9 5-9 12 0 9-2 16-4 22h26c-2-6-4-13-4-22 0-7-3-12-9-12z" fill={BODY} />
          <ellipse cx="24" cy="18" rx="4.6" ry="5.6" fill="#0a0a0c" />
          <Eyes x1={22} x2={26} y={18} />
        </svg>
      );
    case "vampire":
      return (
        <svg {...p}>
          <path d="M24 14L8 22q3 12 16 18 13-6 16-18z" fill={BODY} />
          <path d="M18 8q6-4 12 0 2 5-6 6-8-1-6-6z" fill={PALE} />
          <path d="M16 8q4-5 8-4 4-1 8 4l-3-2q-5 2-10 0z" fill={BODY} />
          <Eyes x1={21} x2={27} y={9} />
          <path d="M22 13l1 2 1-2zM25 13l1 2 1-2z" fill="#fff" />
        </svg>
      );
    case "berserker":
      return (
        <svg {...p}>
          <path d="M9 18l8 6-9 2zM30 8l10 2-9 5z" fill={GOLD} />
          <path d="M30 8l5 26" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <path d="M18 9l-3-6 5 4zM30 9l3-6-5 4z" fill="#5a4a2a" />
          <path d="M17 11q7-4 14 0q1 7-7 11q-8-4-7-11z" fill="#9c8b6a" />
          <path d="M14 24q10-4 20 0l-3 16H17z" fill={BODY} />
          <Eyes x1={21} x2={27} y={17} />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M24 8c-6 0-10 5-10 12 0 8-2 14-4 20h28c-2-6-4-12-4-20 0-7-4-12-10-12z" fill={BODY} />
          <Eyes x1={21.5} x2={26.5} y={18} />
        </svg>
      );
  }
}
