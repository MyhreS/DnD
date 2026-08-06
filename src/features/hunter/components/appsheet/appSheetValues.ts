import type { SheetData } from "@/types";

export function sheetText(data: SheetData, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value : "";
}

export function sheetBool(data: SheetData, field: string): boolean {
  return data[field] === true;
}
