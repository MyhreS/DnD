import type { ReactNode } from "react";

export function CharacterSheetPageLayout({
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
  return <div className={`character-sheet-page-layout ${className}`.trim()}>
    {header}
    <div className={`character-sheet-page-layout-content ${contentClassName}`.trim()}>{children}</div>
    {footer}
  </div>;
}
