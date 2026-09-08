import { Fragment } from "react";
import { highlightSegments } from "@/lib/search";

export function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return text;
  return highlightSegments(text, query).map((segment, index) =>
    segment.hit ? <mark key={index}>{segment.text}</mark> : <Fragment key={index}>{segment.text}</Fragment>,
  );
}
