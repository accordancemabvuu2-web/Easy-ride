export function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function readRecords<T>(key: string, fallback: T[] = []): T[] {
  if (typeof window === "undefined") {
    return [...fallback];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [...fallback];
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function writeRecords<T>(
  key: string,
  value: T[],
  maxItems = 200,
) {
  if (typeof window === "undefined") {
    return;
  }

  const compacted = value.slice(0, maxItems);

  try {
    window.localStorage.setItem(key, JSON.stringify(compacted));
  } catch {
    const trimmed = compacted.slice(0, Math.max(1, Math.floor(maxItems / 2)));
    window.localStorage.setItem(key, JSON.stringify(trimmed));
  }
}

export function upsertRecord<T extends { id: string }>(
  records: T[],
  record: T,
) {
  const next = records.filter((item) => item.id !== record.id);
  next.unshift(record);
  return next;
}

export function removeRecord<T extends { id: string }>(
  records: T[],
  recordId: string,
) {
  return records.filter((item) => item.id !== recordId);
}
