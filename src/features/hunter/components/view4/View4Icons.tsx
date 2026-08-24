import type { SVGProps } from "react";

export type View4IconName = "abilities" | "skills" | "features" | "inventory" | "notes" | "profile" | "resources" | "armor";

export function View4Icon({ name, ...props }: { name: View4IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === "abilities" && <><path d="M4 18 9 5l3 8 3-6 5 11" /><path d="M3 18h18" /></>}
    {name === "skills" && <><circle cx="8" cy="7" r="3" /><path d="M3 20c.5-4 2.2-7 5-7 1.4 0 2.5.7 3.3 1.8" /><path d="m14 15 2 2 5-6" /></>}
    {name === "features" && <><path d="m12 3 2.1 4.9L19 10l-4.9 2.1L12 17l-2.1-4.9L5 10l4.9-2.1L12 3Z" /><path d="m18 15 .8 1.8L21 18l-2.2 1.2L18 21l-.8-1.8L15 18l2.2-1.2L18 15Z" /></>}
    {name === "inventory" && <><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M9 12h6" /></>}
    {name === "notes" && <><path d="M5 3h14v18H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>}
    {name === "profile" && <><circle cx="12" cy="7" r="3" /><path d="M5 21c.8-5 3.1-8 7-8s6.2 3 7 8" /></>}
    {name === "resources" && <><path d="M12 3C9 7 6 10 6 14a6 6 0 0 0 12 0c0-4-3-7-6-11Z" /><path d="M9 15h6M12 12v6" /></>}
    {name === "armor" && <><path d="m8 4 4-2 4 2 4 2-2 5v9l-6 2-6-2v-9L4 6l4-2Z" /><path d="M8 4c1 3 7 3 8 0M12 7v15" /></>}
  </svg>;
}
