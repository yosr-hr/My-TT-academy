import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/** Shared primary action button used by the authentication forms. */
export default function GradientButton({ children, className = "", ...props }: GradientButtonProps) {
  return (
    <button
      className={`w-full rounded-xl bg-gradient-to-r from-[#0077C8] via-[#00B2A9] to-[#84BD00] p-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition transform active:scale-[0.98] disabled:bg-gray-400 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
