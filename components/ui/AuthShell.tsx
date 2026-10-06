import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  maxWidth?: "md" | "2xl";
  padding?: string;
}

/** Shared centered shell used by the public authentication pages. */
export default function AuthShell({ children, maxWidth = "md", padding = "p-8" }: AuthShellProps) {
  const widthClass = maxWidth === "2xl" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="flex min-h-screen items-center justify-center tt-gradient-bg px-4">
      <div className={`w-full ${widthClass} space-y-6 rounded-3xl bg-white/95 ${padding} shadow-2xl border border-white/20 backdrop-blur-sm`}>
        {children}
      </div>
    </div>
  );
}
