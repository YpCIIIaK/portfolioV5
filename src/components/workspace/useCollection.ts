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

  const reload = useCallback(async () => {
    if (!owner) {
      setItems(demo);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await wsList<T>(kind));
    } catch {
      setError("Не удалось загрузить данные. Проверь настройку Supabase.");
    } finally {
      setLoading(false);
    }
  }, [owner, kind, demo]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, setItems, loading, error, readonly: !owner, reload };
}
