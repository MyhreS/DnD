import { useWorkshopTip } from "@/workshop/hooks/useWorkshopTip";

export function WorkshopTip() {
  const tip = useWorkshopTip();
  return <p className="workshop-tip" data-testid="workshop-tip"><span>Tip:</span> {tip}</p>;
}
