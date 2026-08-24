import type { ReactNode } from "react";

export function View4PageLayout({
  header,
  children,
  footer,
  className = "",
  contentClassName = "",
}: {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return <div className={`v4-page-layout ${className}`.trim()}>
    {header}
    <div className={`v4-page-layout-content ${contentClassName}`.trim()}>{children}</div>
    {footer}
  </div>;
}
