export function formatDate(value: string | Date | null | undefined, fallback = "Non spécifiée") {
  if (!value) return fallback;

  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function formatLongDate(value: string | Date | null | undefined, fallback = "-") {
  if (!value) return fallback;

  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

export function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}
