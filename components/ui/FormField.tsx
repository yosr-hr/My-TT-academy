import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FormControlProps =
  | ({ control?: "input" } & InputHTMLAttributes<HTMLInputElement>)
  | ({ control: "select" } & SelectHTMLAttributes<HTMLSelectElement>)
  | ({ control: "textarea" } & TextareaHTMLAttributes<HTMLTextAreaElement>);

type FormFieldProps = FormControlProps & {
  label: string;
  wrapperClassName?: string;
};

const defaultClassName = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-900 outline-none transition focus:border-[#0077C8] focus:bg-white focus:ring-1 focus:ring-[#0077C8]";

/** Labeled form control with the shared authentication form styling. */
export default function FormField({ label, wrapperClassName = "", className, control = "input", ...props }: FormFieldProps) {
  const mergedClassName = `${defaultClassName} ${className || ""}`.trim();

  return (
    <div className={wrapperClassName}>
      <label className="block text-sm font-semibold text-[#002F6C]">{label}</label>
      {control === "select" ? (
        <select className={mergedClassName} {...props as SelectHTMLAttributes<HTMLSelectElement>} />
      ) : control === "textarea" ? (
        <textarea className={mergedClassName} {...props as TextareaHTMLAttributes<HTMLTextAreaElement>} />
      ) : (
        <input className={mergedClassName} {...props as InputHTMLAttributes<HTMLInputElement>} />
      )}
    </div>
  );
}
