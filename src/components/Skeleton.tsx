import type { CSSProperties } from "react";

export function Skeleton({
  height = 16,
  width = "100%",
  style,
}: {
  height?: number | string;
  width?: number | string;
  style?: CSSProperties;
}) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

/** A card-shaped placeholder to hold layout steady while data loads. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <div className="stack" style={{ gap: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={i === 0 ? 22 : 14} width={i === 0 ? "55%" : "100%"} />
        ))}
      </div>
    </div>
  );
}
