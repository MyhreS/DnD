import { classArt } from "@/data/classArt";

/**
 * Full-width class splash banner for the hunter-sheet header. Renders the book
 * class art when the class has it (with a dark gradient so overlaid text stays
 * readable); otherwise renders nothing and the sheet falls back to the sigil.
 */
export function ClassArt({
  classId,
  alt,
}: {
  classId: string | undefined;
  alt: string;
}) {
  const src = classArt(classId);
  if (!src) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: 150, overflow: "hidden" }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          // Hide a failed image (renamed/removed asset, network hiccup) rather
          // than show a broken-image icon — the identity text below still reads.
          e.currentTarget.parentElement?.style.setProperty("display", "none");
        }}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
