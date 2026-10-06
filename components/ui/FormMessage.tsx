interface FormMessageProps {
  type: "success" | "error" | "info" | "warning" | "";
  children: string;
}

/** Inline form feedback preserving the existing success/error appearance. */
export default function FormMessage({ type, children }: FormMessageProps) {
  if (!children) return null;

  const styles = type === "success"
    ? "bg-green-50 text-green-800 border-green-200"
    : "bg-red-50 text-red-800 border-red-200";

  return <div className={`p-4 text-sm rounded-xl border ${styles}`}>{children}</div>;
}
