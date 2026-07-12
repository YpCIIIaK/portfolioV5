"use client";

import { useCallback, useEffect, useState } from "react";
import { getCached, setCached, invalidate } from "@/lib/cache";
import type { NewsSnapshot } from "@/lib/news";

const CACHE_KEY = "news:snapshot:v2";
const POLL_MS = 5 * 60 * 1000;

export function useNews() {
  const [data, setData] = useState<NewsSnapshot | null>(() => getCached<NewsSnapshot>(CACHE_KEY) ?? null);
  const [loading, setLoading] = useState(!getCached<NewsSnapshot>(CACHE_KEY));
  const [error, setError] = useState("");

  const load = useCallback(async (force = false) => {
    if (force) invalidate(CACHE_KEY);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/news${force ? "?force=1" : ""}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json as NewsSnapshot);
      setCached(CACHE_KEY, json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getCached<NewsSnapshot>(CACHE_KEY)) return;
    load(false);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  return { data, loading, error, refresh: () => load(true) };
}

export function newsWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const h = Math.round(diff / 3600000);
  if (h < 1) return "сейчас";
  if (h < 24) return `${h} ч`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} д`;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}
