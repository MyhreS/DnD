// Inline SVG icons — line style, inherit currentColor.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
      <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
    </svg>
  );
}

export function HunterIcon(props: IconProps) {
  // A stylised hunter mask / skull-ish sigil.
  return (
    <svg {...base(props)}>
      <path d="M12 3c-4 0-6.5 2.6-6.5 6.4 0 2 .8 3.4 2 4.7.7.8.9 1.4.9 2.6V19a2 2 0 0 0 2 2h3.2a2 2 0 0 0 2-2v-2.3c0-1.2.2-1.8.9-2.6 1.2-1.3 2-2.7 2-4.7C18.5 5.6 16 3 12 3Z" />
      <path d="M9.3 10.2c.6-.5 1.4-.5 2 0M12.7 10.2c.6-.5 1.4-.5 2 0" />
      <path d="M12 14v2.4" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 0-2 2V4.5Z" />
      <path d="M4 19.5A2 2 0 0 1 6 18h14" />
      <path d="M8.5 8h7M8.5 11h5" />
    </svg>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
      <path d="M10 12h9M16 9l3 3-3 3" />
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

/** The brand sigil — a blood-drop + star eye, reused in the header. */
export function Sigil(props: IconProps) {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="24" cy="24" r="22" stroke="var(--gold)" strokeWidth="1.5" opacity="0.5" />
      <path
        d="M24 7c5 7.5 9 12.4 9 17.6A9 9 0 0 1 15 24.6C15 19.4 19 14.5 24 7Z"
        fill="var(--blood)"
      />
      <path
        d="M24 19.5l1.6 3.4 3.7.4-2.8 2.5.8 3.6L24 27.5l-3.3 1.9.8-3.6-2.8-2.5 3.7-.4L24 19.5Z"
        fill="#0a0a0c"
      />
    </svg>
  );
}
