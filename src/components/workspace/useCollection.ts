"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { wsList, type Kind } from "@/lib/workspace";

/**
 * Loads a workspace collection. Owners get live data from Supabase; everyone
 * else gets read-only demo data. `readonly` drives the disabled UI state.
 */
export function useCollection<T>(kind: Kind, demo: T[]) {
  const user = useSession((s) => s.user);
  const owner = !!user?.owner;
  const [items, setItems] = useState<T[]>(demo);
  const [loading, setLoading] = useState(owner);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  // Reset to the demo snapshot when ownership flips (login/logout).
  const [prevOwner, setPrevOwner] = useState(owner);
  if (prevOwner !== owner) {
    setPrevOwner(owner);
    setItems(demo);
    setLoading(owner);
    setError(null);
  }

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await wsList<T>(kind);
        if (cancelled) return;
        setItems(data);
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
  }, [owner, kind, fetchKey]);

  // Manual refresh; safe to call from event handlers.
  const reload = useCallback(() => {
    setLoading(true);
    setFetchKey((k) => k + 1);
  }, []);

  return { items, setItems, loading, error, readonly: !owner, reload };
}
