const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const auditStampFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Accepts the value shapes that reach the admin UI: ISO strings, epoch numbers,
 * Date objects, Firestore Timestamps and `{ seconds, nanoseconds }` objects.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  if (typeof value === "object") {
    const candidate = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof candidate.toDate === "function") {
      const parsed = candidate.toDate();
      if (parsed instanceof Date && Number.isFinite(parsed.getTime())) return parsed;
    }

    if (typeof candidate.seconds === "number") {
      const parsed = new Date(candidate.seconds * 1000);
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    }
  }

  return null;
}

export function formatDate(value: unknown, fallback = "Not available"): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatDateTime(value: unknown, fallback = "Not available"): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

export function formatAuditStamp(value: unknown, fallback = ""): string {
  const date = toDate(value);
  return date ? auditStampFormatter.format(date) : fallback;
}

export function formatCurrencyAmount(amount: number, currency = "USD"): string {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatCount(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
}

/** `under_review` -> `Under review` */
export function humanize(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().replaceAll("_", " ");
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
