"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { DEMO_MAIL, mailStatus, mailList, type MailSummary } from "@/lib/mail";
import { getCached, setCached, invalidate } from "@/lib/cache";

interface MailCache {
  items: MailSummary[];
  live: boolean;
}

/**
 * Loads the inbox. Owner with a configured IMAP mailbox gets live mail;
 * everyone else (and owners without IMAP set up) gets read-only demo data.
 */
export function useMailbox(limit: number) {
  const user = useSession((s) => s.user);
  const owner = !!user?.owner;
  const cacheKey = `mail:${limit}`;

  const cached = owner ? getCached<MailCache>(cacheKey) : undefined;
  const [items, setItems] = useState<MailSummary[]>(cached?.items ?? DEMO_MAIL.slice(0, limit));
  const [loading, setLoading] = useState(owner && !cached);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(cached?.live ?? false);
  const [fetchKey, setFetchKey] = useState(0);

  // Reset to the demo snapshot (or fresh cache) when ownership flips.
  const [prevOwner, setPrevOwner] = useState(owner);
  if (prevOwner !== owner) {
    setPrevOwner(owner);
    const c = owner ? getCached<MailCache>(cacheKey) : undefined;
    setItems(c?.items ?? DEMO_MAIL.slice(0, limit));
    setLive(c?.live ?? false);
    setLoading(owner && !c);
    setError(null);
  }

  useEffect(() => {
    if (!owner) return;
    // Serve from cache when fresh — state is already seeded from it, so just
    // skip the fetch. Avoids refetching on every tab switch.
    if (getCached<MailCache>(cacheKey)) return;
    let cancelled = false;
    (async () => {
      try {
        const { configured } = await mailStatus();
        if (cancelled) return;
        if (!configured) {
          const demo = DEMO_MAIL.slice(0, limit);
          setItems(demo);
          setLive(false);
          setCached<MailCache>(cacheKey, { items: demo, live: false });
          return;
        }
        const list = await mailList(limit);
        if (cancelled) return;
        setItems(list);
        setLive(true);
        setCached<MailCache>(cacheKey, { items: list, live: true });
        setError(null);
      } catch {
        if (cancelled) return;
        setItems(DEMO_MAIL.slice(0, limit));
        setLive(false);
        setError("Не удалось получить почту. Проверь IMAP-настройки.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, limit, cacheKey, fetchKey]);

  // Manual refresh; drops the cache so the effect refetches.
  const reload = useCallback(() => {
    invalidate(cacheKey);
    setLoading(true);
    setFetchKey((k) => k + 1);
  }, [cacheKey]);

  return { items, loading, error, live, reload, readonly: !live };
}
