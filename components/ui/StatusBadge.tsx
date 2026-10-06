import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  className?: string;
}

/** Small status label with feature-specific color classes supplied by the caller. */
export default function StatusBadge({ children, className = "" }: StatusBadgeProps) {
  return <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${className}`}>{children}</span>;
}
