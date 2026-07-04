import type { ActivityEvent, ActivityType } from "@/types";

/** A small glyph per event family — scannable, no icon font needed. */
export function typeGlyph(type: ActivityType): string {
  if (type.startsWith("game.")) return "⚔";
  if (type.startsWith("session.")) return "◷";
  if (type.startsWith("member.") || type === "hunter.brought") return "☩";
  if (type.startsWith("loot.") || type === "item.given") return "☒";
  if (type.startsWith("shop.") || type === "gold.changed") return "◈";
  if (type === "trade.accepted") return "⇄";
  if (type === "hunter.died") return "☠";
  if (type === "hunter.rested") return "☾";
  if (type === "hunter.leveled" || type === "insight.awarded") return "★";
  return "◆";
}

export function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Group (already newest-first) events under day headers. */
export function groupByDay(events: ActivityEvent[]): { day: string; events: ActivityEvent[] }[] {
  const groups: { day: string; events: ActivityEvent[] }[] = [];
  for (const e of events) {
    const day = dayLabel(e.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(e);
    else groups.push({ day, events: [e] });
  }
  return groups;
}
