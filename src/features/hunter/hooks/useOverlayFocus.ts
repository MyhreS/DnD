import { useEffect, useRef } from "react";

export function useOverlayFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);

  return ref;
}
