import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  overlayClassName?: string;
  panelClassName?: string;
}

/** Shared modal frame; callers provide the existing feature-specific content and styling. */
export default function Modal({ children, onClose, overlayClassName = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto", panelClassName = "bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col my-8 max-h-[90vh]" }: ModalProps) {
  return (
    <div className={overlayClassName} onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className={panelClassName} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
