import type { SVGProps } from "react";

function Eyes({ cx1, cx2, cy, r = 3 }: { cx1: number; cx2: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx1} cy={cy} r={r} fill="#fff" />
      <circle cx={cx2} cy={cy} r={r} fill="#fff" />
      <circle cx={cx1} cy={cy + 0.5} r={r / 2.2} fill="#13110c" />
      <circle cx={cx2} cy={cy + 0.5} r={r / 2.2} fill="#13110c" />
    </>
  );
}

/** Renders the SVG for a creature id (48×48 viewBox). */
export function CreatureSprite({
  id,
  size = 40,
  ...rest
}: { id: string; size?: number } & SVGProps<SVGSVGElement>) {
  const p = { width: size, height: size, viewBox: "0 0 48 48", xmlns: "http://www.w3.org/2000/svg", ...rest };
  switch (id) {
    case "orc":
      return (
        <svg {...p}>
          <ellipse cx="24" cy="27" rx="15" ry="14" fill="#5b8f4e" />
          <path d="M10 22q-3-2-1-5M38 22q3-2 1-5" stroke="#5b8f4e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M18 33l-2 5M30 33l2 5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M16 20l5 2M32 20l-5 2" stroke="#2f5a28" strokeWidth="2" strokeLinecap="round" />
          <Eyes cx1={19} cx2={29} cy={24} />
        </svg>
      );
    case "goblin":
      return (
        <svg {...p}>
          <path d="M9 26l-6-4 7-1zM39 26l6-4-7-1z" fill="#7aa85e" />
          <ellipse cx="24" cy="27" rx="13" ry="13" fill="#8cbb6a" />
          <path d="M24 27l3 5h-6z" fill="#5e8044" />
          <Eyes cx1={19} cx2={29} cy={24} r={3.4} />
        </svg>
      );
    case "slime":
      return (
        <svg {...p}>
          <path d="M8 36c0-12 6-18 16-18s16 6 16 18c0 2-2 3-4 2s-3 1-5 1-3-1-5-1-3 2-5 1-3-2-5-1-3 1-3-2z" fill="#8a5cd0" />
          <circle cx="29" cy="22" r="2" fill="#fff" opacity="0.6" />
          <Eyes cx1={19} cx2={29} cy={28} r={3.4} />
        </svg>
      );
    case "bat":
      return (
        <svg {...p}>
          <path d="M24 24L6 18q4 8 9 7 0 4 9 4t9-4q5 1 9-7z" fill="#4a4458" />
          <circle cx="24" cy="27" r="9" fill="#5a5468" />
          <path d="M20 33l1.5 3M28 33l-1.5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <Eyes cx1={21} cx2={27} cy={25} r={2.6} />
        </svg>
      );
    case "ghost":
      return (
        <svg {...p}>
          <path d="M12 40V26c0-8 5-13 12-13s12 5 12 13v14c0 2-2 2-3 0s-2-2-3 0-2 2-3 0-2-2-3 0-2 2-3 0-3 2-3 0z" fill="#dcd8cb" opacity="0.92" />
          <Eyes cx1={20} cx2={28} cy={25} r={3} />
          <ellipse cx="24" cy="31" rx="2.5" ry="3" fill="#13110c" />
        </svg>
      );
    case "skull":
      return (
        <svg {...p}>
          <path d="M12 24c0-8 5-13 12-13s12 5 12 13c0 5-3 7-3 9 0 3-3 3-3 5h-12c0-2-3-2-3-5 0-2-3-4-3-9z" fill="#e6e1d3" />
          <circle cx="19" cy="24" r="4" fill="#13110c" />
          <circle cx="29" cy="24" r="4" fill="#13110c" />
          <path d="M24 28l-2 4h4z" fill="#a59c86" />
          <path d="M19 36v3M24 36v3M29 36v3" stroke="#a59c86" strokeWidth="1.6" />
        </svg>
      );
    case "beholder":
      return (
        <svg {...p}>
          <path d="M24 22l-12-6M24 22l12-6M24 22l-13 4M24 22l13 4M24 22v-10" stroke="#7a4b86" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="14" cy="14" r="2.5" fill="#7a4b86" />
          <circle cx="34" cy="14" r="2.5" fill="#7a4b86" />
          <circle cx="11" cy="27" r="2.5" fill="#7a4b86" />
          <circle cx="37" cy="27" r="2.5" fill="#7a4b86" />
          <ellipse cx="24" cy="28" rx="13" ry="12" fill="#8a5c96" />
          <circle cx="24" cy="27" r="7" fill="#fff" />
          <circle cx="24" cy="27" r="4" fill="#b3121a" />
          <circle cx="24" cy="27" r="1.8" fill="#13110c" />
        </svg>
      );
    case "crow":
      return (
        <svg {...p}>
          <ellipse cx="24" cy="28" rx="12" ry="12" fill="#26242c" />
          <path d="M36 26l8-2-7 5z" fill="#c9a45a" />
          <path d="M14 28q-5 2-7 7 6-1 9-4z" fill="#1b1a20" />
          <circle cx="20" cy="24" r="3" fill="#fff" />
          <circle cx="20" cy="24" r="1.4" fill="#13110c" />
        </svg>
      );
    case "imp":
      return (
        <svg {...p}>
          <path d="M15 18l-3-7 6 5zM33 18l3-7-6 5z" fill="#a3242a" />
          <ellipse cx="24" cy="27" rx="13" ry="13" fill="#c0353c" />
          <path d="M37 30q6 2 7 8-5-1-8-4z" fill="#a3242a" />
          <path d="M19 33l2 3 3-3 3 3 2-3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Eyes cx1={19} cx2={29} cy={24} />
        </svg>
      );
    case "myconid":
      return (
        <svg {...p}>
          <rect x="20" y="26" width="8" height="14" rx="4" fill="#e3dcc8" />
          <path d="M8 26c0-10 7-15 16-15s16 5 16 15z" fill="#b3322f" />
          <circle cx="16" cy="20" r="2.2" fill="#f0e6cf" />
          <circle cx="30" cy="18" r="2.6" fill="#f0e6cf" />
          <circle cx="24" cy="24" r="2" fill="#f0e6cf" />
          <Eyes cx1={21} cx2={27} cy={33} r={2.4} />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="24" cy="27" r="13" fill="#7a7488" />
          <Eyes cx1={19} cx2={29} cy={25} />
        </svg>
      );
  }
}
