import { format, isToday, isTomorrow } from "date-fns";

/** Human-friendly label for a session date. */
export function whenLabel(date: Date): string {
  if (isToday(date)) return `Today · ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow · ${format(date, "HH:mm")}`;
  return format(date, "EEEE d MMMM yyyy · HH:mm");
}
