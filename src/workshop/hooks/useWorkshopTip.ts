import { useEffect, useState } from "react";

const WORKSHOP_TIPS = [
  "Paste screenshots directly with ⌘V or Ctrl+V.",
  "Press Enter to send. Use Shift+Enter for a new line.",
  "Reply in an existing thread when the extra detail belongs to the same request.",
];

export function useWorkshopTip(): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WORKSHOP_TIPS.length);
    }, 12_000);
    return () => window.clearInterval(timer);
  }, []);

  return WORKSHOP_TIPS[index];
}
