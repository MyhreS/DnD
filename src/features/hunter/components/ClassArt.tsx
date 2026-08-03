import { classArt } from "@/data/classArt";

/**
 * Full-width class splash banner. Renders the book class art when the class has
 * it (cover-cropped onto the per-image focal point so the figure's face stays
 * in frame, with a dark gradient so overlaid text stays readable); otherwise
 * renders nothing and the caller falls back to the sigil.
 *
 * By default the height is responsive (aspect-ratio capped between 150 and
 * 240px) so the wide desktop sheet doesn't get an extreme sliver crop; pass
 * `height` for a fixed-height banner (e.g. list cards).
 */
export function ClassArt({
  classId,
  alt,
  height,
}: {
  classId: string | undefined;
  alt: string;
  height?: number;
}) {
  const art = classArt(classId);
  if (!art) return null;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        ...(height != null
          ? { height }
          : { aspectRatio: "5 / 2", minHeight: 150, maxHeight: 240 }),
      }}
    >
      <img
        src={art.src}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          // Hide a failed image (renamed/removed asset, network hiccup) rather
          // than show a broken-image icon — the identity text below still reads.
          e.currentTarget.parentElement?.style.setProperty("display", "none");
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: art.focus,
          display: "block",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,8,12,0) 35%, rgba(10,8,12,0.62) 100%)",
        }}
      />
    </div>
  );
}
