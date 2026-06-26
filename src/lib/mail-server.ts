/**
 * Read-only IMAP inbox reader — server-side only.
 *
 * No OAuth: works with any IMAP mailbox via an app password (Yandex, Gmail,
 * Mail.ru, …). Configure through env; if unset the feature stays in demo mode.
 *
 *   MAIL_IMAP_HOST=imap.yandex.ru
 *   MAIL_IMAP_PORT=993
 *   MAIL_USER=you@yandex.ru
 *   MAIL_PASSWORD=<app password>
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { MailFull, MailSummary } from "@/lib/mail";

const HOST = process.env.MAIL_IMAP_HOST;
const PORT = Number(process.env.MAIL_IMAP_PORT || 993);
const USER = process.env.MAIL_USER;
const PASS = process.env.MAIL_PASSWORD;

export function mailConfigured(): boolean {
  return !!HOST && !!USER && !!PASS;
}

function client(): ImapFlow {
  return new ImapFlow({
    host: HOST!,
    port: PORT,
    secure: PORT === 993,
    auth: { user: USER!, pass: PASS! },
    logger: false,
    // Fail fast instead of hanging the UI if IMAP is unreachable/blocked.
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 20000,
  });
}

function addr(a?: { value?: { name?: string; address?: string }[] }): string {
  const first = a?.value?.[0];
  if (!first) return "";
  return first.name || first.address || "";
}

/** Newest `limit` inbox messages, metadata only. */
export async function fetchInbox(limit: number): Promise<MailSummary[]> {
  const c = client();
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      const total = typeof c.mailbox === "object" ? c.mailbox.exists : 0;
      if (!total) return [];
      const start = Math.max(1, total - limit + 1);
      const out: MailSummary[] = [];
      for await (const msg of c.fetch(`${start}:*`, { uid: true, envelope: true, flags: true })) {
        const env = msg.envelope;
        out.push({
          uid: msg.uid,
          from: env?.from?.[0]?.name || env?.from?.[0]?.address || "",
          subject: env?.subject || "(без темы)",
          date: env?.date ? new Date(env.date).toISOString() : "",
          snippet: "",
          unread: !msg.flags?.has("\\Seen"),
        });
      }
      return out.reverse(); // newest first
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => {});
  }
}

/** Full message body (plain text, best effort) by UID. */
export async function fetchMessage(uid: number): Promise<MailFull | null> {
  const c = client();
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      const msg = await c.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
      if (!msg || !msg.source) return null;
      const parsed = await simpleParser(msg.source);
      const html = typeof parsed.html === "string" ? parsed.html : null;
      return {
        uid,
        from: addr(parsed.from) || parsed.from?.text || "",
        subject: parsed.subject || "(без темы)",
        date: parsed.date ? parsed.date.toISOString() : "",
        snippet: "",
        unread: false,
        body: parsed.text || (html ? html.replace(/<[^>]+>/g, " ") : "") || "",
        html,
      };
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => {});
  }
}
