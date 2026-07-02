import type { HunterCard, LevelFeature } from "@/types";
import { getClass, getSubclass } from "@/data/classes";
import { FEATS } from "@/data/feats";
import { isZealot } from "@/lib/character";

/** Everything this hunter has actually gained: origin feat + level-up feats,
 * and every class/subclass feature up to the current level. A Hunter Zealot's
 * "Burn the Book" REPLACES all Deepcaller class features with the Zealot's. */
export function FeaturesSection({ card }: { card: HunterCard }) {
  const klass = getClass(card.classId);
  if (!klass) return null;
  const lvl = card.level;
  const zealot = isZealot(card);
  const sub = getSubclass(card.classId, card.subclassId);

  // Burn the Book: the Zealot keeps NO Deepcaller class features — the
  // subclass list IS the feature list. Everyone else stacks class + subclass.
  const classFeatures = zealot ? [] : (klass.features ?? []).filter((f) => f.level <= lvl);
  const subFeatures = (sub?.features ?? []).filter((f) => f.level <= lvl);
  const features: (LevelFeature & { from: string })[] = [
    ...classFeatures.map((f) => ({ ...f, from: klass.name })),
    ...subFeatures.map((f) => ({ ...f, from: sub!.name })),
  ].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const featNames = [
    ...(card.feat ? [card.feat] : []),
    ...(card.feats ?? []),
  ];

  if (features.length === 0 && featNames.length === 0) return null;

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Feats &amp; features</p>

      {featNames.length > 0 && (
        <div className="stack" style={{ gap: 4, marginBottom: features.length ? 10 : 0 }}>
          {featNames.map((name, i) => {
            // Level-up picks can carry a suffix, e.g. "Ability Score Improvement (+2 STR)".
            const bare = name.replace(/\s*\(.*\)$/, "");
            const text = FEATS.find((f) => f.name === bare)?.text;
            return (
              <details key={`${name}-${i}`}>
                <summary style={{ cursor: "pointer", fontSize: "0.92rem" }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span className="faint" style={{ fontSize: "0.74rem" }}>
                    {" "}· {i === 0 && card.feat === name ? "origin feat" : "feat"}
                  </span>
                </summary>
                {text && (
                  <p className="muted" style={{ fontSize: "0.86rem", margin: "6px 0 4px", whiteSpace: "pre-wrap" }}>
                    {text}
                  </p>
                )}
              </details>
            );
          })}
        </div>
      )}

      {zealot && (
        <p className="faint" style={{ fontSize: "0.8rem", marginTop: 0 }}>
          Burn the Book — all Deepcaller features are replaced by the Zealot's below.
        </p>
      )}

      <div className="stack" style={{ gap: 4 }}>
        {features.map((f) => (
          <details key={`${f.from}-${f.level}-${f.name}`}>
            <summary style={{ cursor: "pointer", fontSize: "0.92rem" }}>
              <span style={{ fontWeight: 600 }}>{f.name}</span>
              <span className="faint" style={{ fontSize: "0.74rem" }}> · {f.from} {f.level}</span>
            </summary>
            <p className="muted" style={{ fontSize: "0.86rem", margin: "6px 0 4px", whiteSpace: "pre-wrap" }}>
              {f.text}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
