/** localStorage cache keyed by calendar day (local timezone). */

export function localDayKey(d = new Date()): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export interface DailyEntry<T> {
  day: string;
  data: T;
  savedAt: string;
}

export function getDaily<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as DailyEntry<T>;
    if (entry.day !== localDayKey()) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function setDaily<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  const entry: DailyEntry<T> = { day: localDayKey(), data, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch { /* quota */ }
}

export const DAILY_BRIEF_KEY = "ai:brief:daily";
