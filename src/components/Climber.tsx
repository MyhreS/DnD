import type { SVGProps } from "react";

// An articulated humanoid that actually climbs — arms reach and legs push in a
// loop (SMIL rotates each limb around its joint; works on iOS Safari). One rig,
// themed per creature (palette + head + back accessory + weapon).

interface Theme {
  body: string;
  limb: string;
  accent: string;
  head: "hood" | "halo" | "horns" | "helm" | "hair" | "bare";
  back?: "wings" | "cape";
  weapon?: "scythe" | "sword" | "spear" | "staff" | "axe";
}

const THEMES: Record<string, Theme> = {
  reaper: { body: "#2b2733", limb: "#211e28", accent: "#c9a45a", head: "hood", weapon: "scythe" },
  "dark-angel": { body: "#2f2b38", limb: "#26232e", accent: "#c9a45a", head: "halo", back: "wings", weapon: "sword" },
  demon: { body: "#8b1a1a", limb: "#6e1414", accent: "#d6202a", head: "horns" },
  knight: { body: "#3f3a48", limb: "#332f3b", accent: "#9aa0ab", head: "helm", weapon: "sword" },
  valkyrie: { body: "#3a3543", limb: "#2f2b38", accent: "#cfc8d6", head: "helm", back: "wings", weapon: "spear" },
  gargoyle: { body: "#5a5563", limb: "#4a4653", accent: "#7b7686", head: "horns", back: "wings" },
  wraith: { body: "#26232e", limb: "#1c1a23", accent: "#5a5468", head: "hood" },
  sorcerer: { body: "#2b2733", limb: "#211e28", accent: "#7c5cff", head: "hood", weapon: "staff" },
  vampire: { body: "#26232e", limb: "#1c1a23", accent: "#cfc8d6", head: "hair", back: "cape" },
  berserker: { body: "#3a2f24", limb: "#2e251d", accent: "#c9a45a", head: "horns", weapon: "axe" },
};

const BLOOD = "#d6202a";
// Climb cycle: rotate "<a> cx cy" → "<b> cx cy" → back, around each joint.
const cyc = (a: number, b: number, cx: number, cy: number) =>
  `${a} ${cx} ${cy}; ${b} ${cx} ${cy}; ${a} ${cx} ${cy}`;
const DUR = "1.05s";

function Limb({ d, values }: { d: string; values: string }) {
  return (
    <g>
      <animateTransform attributeName="transform" type="rotate" values={values} keyTimes="0;0.5;1" dur={DUR} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      <path d={d} />
    </g>
  );
}

function Head({ t }: { t: Theme }) {
  return (
    <g>
      {t.back === "wings" && (
        <g fill={t.body} opacity="0.85">
          <path d="M20 22C8 14 3 19 5 29c6-5 10-3 16 2z" />
          <path d="M24 22c12-8 17-3 15 7-6-5-10-3-16 2z" />
        </g>
      )}
      {t.back === "cape" && <path d="M16 21q6 4 12 0l2 26q-7 4-16 0z" fill={t.limb} opacity="0.9" />}
      {t.weapon && <path d="M33 6 L29 40" stroke={t.accent} strokeWidth="2" strokeLinecap="round" />}
      {t.weapon === "scythe" && <path d="M33 6q-9 0-12 6" stroke={t.accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {t.weapon === "sword" && <path d="M30 8h6" stroke={t.accent} strokeWidth="2" strokeLinecap="round" />}
      {t.weapon === "spear" && <path d="M33 6l2 4h-4z" fill={t.accent} />}
      {t.weapon === "staff" && <><circle cx="33" cy="6" r="3" fill={t.accent} /><circle cx="33" cy="6" r="5" fill={t.accent} opacity="0.3" /></>}
      {t.weapon === "axe" && <path d="M33 6q5 1 6 6-4 0-6-2z" fill={t.accent} />}
      {/* head */}
      {t.head === "halo" && <ellipse cx="22" cy="5" rx="6" ry="2" fill="none" stroke={t.accent} strokeWidth="1.3" />}
      {t.head === "horns" && <path d="M17 9l-3-6 5 5zM27 9l3-6-5 5z" fill={t.accent === BLOOD ? "#6e0c0f" : t.accent} />}
      {t.head === "hood" ? (
        <>
          <path d="M22 7c-6 0-8 5-8 9 0 2 1 4 2 5h12c1-1 2-3 2-5 0-4-2-9-8-9z" fill={t.body} />
          <ellipse cx="22" cy="14" rx="3.6" ry="4.4" fill="#0a0a0c" />
        </>
      ) : (
        <circle cx="22" cy="13" r="6" fill={t.body} />
      )}
      {t.head === "helm" && <><path d="M16 13q6-4 12 0v3q-6 3-12 0z" fill={t.accent} /><path d="M22 5l-1.5 4h3z" fill={BLOOD} /></>}
      {t.head === "hair" && <path d="M16 11q6-7 12 0-3-2-6-1-3-1-6 1z" fill="#1a1820" />}
      {t.head !== "hood" && <><circle cx="20" cy="13" r="1.3" fill={BLOOD} /><circle cx="24" cy="13" r="1.3" fill={BLOOD} /></>}
    </g>
  );
}

/** Articulated climbing figure for a creature id. */
export function Climber({ id, size = 56, ...rest }: { id: string; size?: number } & SVGProps<SVGSVGElement>) {
  const t = THEMES[id] ?? THEMES.reaper;
  const p = { width: (size * 44) / 60, height: size, viewBox: "0 0 44 60", xmlns: "http://www.w3.org/2000/svg", ...rest };
  return (
    <svg {...p}>
      <g stroke={t.limb} strokeWidth="5" strokeLinecap="round" fill="none">
        {/* legs push (origin at hips) */}
        <Limb d="M19 38 L14 53" values={cyc(11, -7, 19, 38)} />
        <Limb d="M25 38 L30 53" values={cyc(-11, 7, 25, 38)} />
        {/* arms reach (origin at shoulders) */}
        <Limb d="M18 22 L12 6" values={cyc(7, -11, 18, 22)} />
        <Limb d="M26 22 L32 6" values={cyc(-9, 9, 26, 22)} />
      </g>
      {/* hands gripping */}
      <g fill={t.limb}>
        <Limb d="M12 6 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0" values={cyc(7, -11, 18, 22)} />
        <Limb d="M32 6 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0" values={cyc(-9, 9, 26, 22)} />
      </g>
      {/* torso */}
      <path d="M17 20q5-3 10 0l-1 19q-4 2-8 0z" fill={t.body} />
      <Head t={t} />
    </svg>
  );
}
