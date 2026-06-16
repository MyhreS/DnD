import type { SVGProps } from "react";
import { CREATURE_ART } from "./creatureArt";

// Detailed fantasy figures from game-icons.net (CC BY 3.0). Each creature is a
// silhouette path (512×512) recoloured per theme: a vertical body gradient plus
// a thin accent rim-light that traces the outline for a menacing, badass glow.

interface ArtTheme {
  c1: string; // top of body gradient
  c2: string; // bottom of body gradient
  accent: string; // rim-light / glow
}

const ART: Record<string, ArtTheme> = {
  reaper: { c1: "#3a3543", c2: "#19171f", accent: "#c9a45a" },
  "dark-angel": { c1: "#e3ddea", c2: "#9a93a8", accent: "#c9a45a" },
  demon: { c1: "#bb2630", c2: "#6c0c0f", accent: "#ffb38a" },
  knight: { c1: "#9aa0ab", c2: "#45414d", accent: "#e4e7ec" },
  valkyrie: { c1: "#d2cbd9", c2: "#7b7686", accent: "#c9a45a" },
  gargoyle: { c1: "#7e7989", c2: "#403d47", accent: "#a7a2b0" },
  wraith: { c1: "#3b3649", c2: "#131119", accent: "#7c5cff" },
  sorcerer: { c1: "#4b4072", c2: "#1f1c30", accent: "#9a7bff" },
  vampire: { c1: "#2c2834", c2: "#0e0d12", accent: "#d6202a" },
  berserker: { c1: "#c0904d", c2: "#5d4326", accent: "#c9a45a" },
};

const FALLBACK: ArtTheme = { c1: "#3a3543", c2: "#19171f", accent: "#c9a45a" };

/** Renders a creature id as a themed 512×512 silhouette figure. */
export function CreatureSprite({
  id,
  size = 48,
  ...rest
}: { id: string; size?: number } & SVGProps<SVGSVGElement>) {
  const paths = CREATURE_ART[id] ?? CREATURE_ART.reaper ?? [];
  const t = ART[id] ?? FALLBACK;
  const gid = `cs-grad-${id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.c1} />
          <stop offset="1" stopColor={t.c2} />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={`url(#${gid})`}
          stroke={t.accent}
          strokeWidth={7}
          strokeOpacity={0.55}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      ))}
    </svg>
  );
}
