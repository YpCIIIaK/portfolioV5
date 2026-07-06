/**
 * Tiny module-level TTL cache. Survives component unmount/remount, so switching
 * IDE tabs doesn't refetch data that was loaded moments ago. Entries older than
 * `TTL` are treated as missing and refetched on next access.
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

interface Entry {
  time: number;
  data: unknown;
}

const store = new Map<string, Entry>();

/** Returns cached value if present and fresh, otherwise `undefined`. */
export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() - e.time > ttl) {
    store.delete(key);
    return undefined;
  }
  return e.data as T;
}

/** Stores (or refreshes) a value under `key`. */
export function setCached<T>(key: string, data: T): void {
  store.set(key, { time: Date.now(), data });
}

/** Drops a cached entry so the next access refetches. */
export function invalidate(key: string): void {
  store.delete(key);
}
