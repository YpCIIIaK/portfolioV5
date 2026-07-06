"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { wsList, type Kind } from "@/lib/workspace";
import { getCached, setCached, invalidate } from "@/lib/cache";

/**
 * Loads a workspace collection. Owners get live data from Supabase; everyone
 * else gets read-only demo data. `readonly` drives the disabled UI state.
 */
export function useCollection<T>(kind: Kind, demo: T[]) {
  const user = useSession((s) => s.user);
  const owner = !!user?.owner;
  const cacheKey = `coll:${kind}`;

  const cached = owner ? getCached<T[]>(cacheKey) : undefined;
  const [items, setItemsRaw] = useState<T[]>(cached ?? demo);
  const [loading, setLoading] = useState(owner && !cached);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  // Keep the cache in sync with local edits (task toggles, etc.).
  const setItems = useCallback(
    (next: T[]) => {
      setItemsRaw(next);
      if (owner) setCached(cacheKey, next);
    },
    [owner, cacheKey]
  );

  // Reset to the demo snapshot (or fresh cache) when ownership flips.
  const [prevOwner, setPrevOwner] = useState(owner);
  if (prevOwner !== owner) {
    setPrevOwner(owner);
    const c = owner ? getCached<T[]>(cacheKey) : undefined;
    setItemsRaw(c ?? demo);
    setLoading(owner && !c);
    setError(null);
  }

  useEffect(() => {
    if (!owner) return;
    // Serve from cache when fresh — state is already seeded from it, so just
    // skip the fetch. Avoids refetching on every tab switch.
    if (getCached<T[]>(cacheKey)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await wsList<T>(kind);
        if (cancelled) return;
        setItemsRaw(data);
        setCached(cacheKey, data);
        setError(null);
      } catch {
        if (!cancelled) setError("Не удалось загрузить данные. Проверь настройку Supabase.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, kind, cacheKey, fetchKey]);

  // Manual refresh; drops the cache so the effect refetches.
  const reload = useCallback(() => {
    invalidate(cacheKey);
    setLoading(true);
    setFetchKey((k) => k + 1);
  }, [cacheKey]);

  return { items, setItems, loading, error, readonly: !owner, reload };
}
