"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { DEMO_MAIL, mailStatus, mailList, type MailSummary } from "@/lib/mail";

/**
 * Loads the inbox. Owner with a configured IMAP mailbox gets live mail;
 * everyone else (and owners without IMAP set up) gets read-only demo data.
 */
export function useMailbox(limit: number) {
  const user = useSession((s) => s.user);
  const owner = !!user?.owner;
  const [items, setItems] = useState<MailSummary[]>(DEMO_MAIL.slice(0, limit));
  const [loading, setLoading] = useState(owner);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Reset to the demo snapshot when ownership flips (login/logout).
  const [prevOwner, setPrevOwner] = useState(owner);
  if (prevOwner !== owner) {
    setPrevOwner(owner);
    setItems(DEMO_MAIL.slice(0, limit));
    setLive(false);
    setLoading(owner);
    setError(null);
  }

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const { configured } = await mailStatus();
        if (cancelled) return;
        if (!configured) {
          setItems(DEMO_MAIL.slice(0, limit));
          setLive(false);
          return;
        }
        const list = await mailList(limit);
        if (cancelled) return;
        setItems(list);
        setLive(true);
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
  }, [owner, limit, fetchKey]);

  // Manual refresh; safe to call from event handlers.
  const reload = useCallback(() => {
    setLoading(true);
    setFetchKey((k) => k + 1);
  }, []);

  return { items, loading, error, live, reload, readonly: !live };
}
