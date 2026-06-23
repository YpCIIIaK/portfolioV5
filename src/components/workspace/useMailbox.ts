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

  const reload = useCallback(async () => {
    if (!owner) {
      setItems(DEMO_MAIL.slice(0, limit));
      setLive(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { configured } = await mailStatus();
      if (!configured) {
        setItems(DEMO_MAIL.slice(0, limit));
        setLive(false);
        return;
      }
      setItems(await mailList(limit));
      setLive(true);
    } catch {
      setItems(DEMO_MAIL.slice(0, limit));
      setLive(false);
      setError("Не удалось получить почту. Проверь IMAP-настройки.");
    } finally {
      setLoading(false);
    }
  }, [owner, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, live, reload, readonly: !live };
}
