import { createContext, useContext } from "react";
import type { EquipmentGlyph } from "./View4EquipmentSocket";
import type { UniquePickerConfig } from "./View4UniquePickerForm";

export interface EquipmentPickerOption {
  id: string;
  name: string;
  detail?: string;
  kind?: EquipmentGlyph;
  onChoose: () => void;
}

export interface EquipmentPickerRequest {
  title: string;
  hint?: string;
  current?: EquipmentPickerOption;
  inventory?: EquipmentPickerOption[];
  catalogue?: EquipmentPickerOption[];
  unique?: UniquePickerConfig;
  onRemove?: () => void;
}

export interface PickerContextValue {
  openPicker: (request: EquipmentPickerRequest) => void;
  closePicker: () => void;
}

export const PickerContext = createContext<PickerContextValue | null>(null);

export function useEquipmentPicker() {
  const value = useContext(PickerContext);
  if (!value) throw new Error("Equipment picker must be inside its provider");
  return value;
}
