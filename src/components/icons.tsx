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

export function SignOutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
      <path d="M10 12h9M16 9l3 3-3 3" />
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
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
