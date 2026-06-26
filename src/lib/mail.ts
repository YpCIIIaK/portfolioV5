"use client";

/** Shared mail types, demo data and client fetch helpers. */

export interface MailSummary {
  uid: number;
  from: string;
  subject: string;
  date: string; // ISO
  snippet: string;
  unread: boolean;
}

export interface MailFull extends MailSummary {
  body: string; // plain-text fallback
  html: string | null; // sanitized-ish original HTML, rendered in a sandboxed iframe
}

export const DEMO_MAIL: MailSummary[] = [
  { uid: 1, from: "GitHub", subject: "[portfolioV5] Деплой прошёл успешно", date: new Date().toISOString(), snippet: "", unread: true },
  { uid: 2, from: "Supabase", subject: "Ваш проект готов к работе", date: new Date(Date.now() - 3 * 3600e3).toISOString(), snippet: "", unread: true },
  { uid: 3, from: "LinkedIn", subject: "5 новых вакансий по вашему профилю", date: new Date(Date.now() - 26 * 3600e3).toISOString(), snippet: "", unread: false },
  { uid: 4, from: "Vercel", subject: "Build completed for portfolioV5", date: new Date(Date.now() - 50 * 3600e3).toISOString(), snippet: "", unread: false },
  { uid: 5, from: "npm", subject: "Weekly digest: зависимости в порядке", date: new Date(Date.now() - 72 * 3600e3).toISOString(), snippet: "", unread: false },
];

const DEMO_BODY =
  "Это демо-письмо. Подключи свой почтовый ящик по IMAP (app-пароль), чтобы видеть здесь реальную почту.\n\nWorkspace · personal";

const DEMO_HTML = `<!doctype html><html><body style="font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#1f2328;margin:0;padding:16px;max-width:600px">
  <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 8px;font-size:22px">Демо-письмо ✉️</h1>
    <p style="margin:0;opacity:.9">Так выглядят HTML-письма с баннерами и картинками.</p>
  </div>
  <p style="font-size:15px;line-height:1.6">Привет, <b>Владимир</b>! Это пример отрисовки HTML: <a href="https://example.com" style="color:#2563eb">ссылки</a>, списки и изображения.</p>
  <ul style="font-size:15px;line-height:1.6"><li>Баннеры и инлайн-стили</li><li>Картинки из письма</li><li>Безопасный sandbox-рендер</li></ul>
  <p style="font-size:13px;color:#6b7280">Подключи IMAP, чтобы видеть реальную почту.</p>
</body></html>`;

interface MailStatus {
  configured: boolean;
}

export async function mailStatus(): Promise<MailStatus> {
  const res = await fetch("/api/mail/status", { cache: "no-store" });
  if (!res.ok) return { configured: false };
  return res.json();
}

export async function mailList(limit: number): Promise<MailSummary[]> {
  const res = await fetch(`/api/mail/messages?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { items: MailSummary[] }).items;
}

export async function mailRead(uid: number): Promise<MailFull> {
  const res = await fetch(`/api/mail/messages?uid=${uid}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { item: MailFull }).item;
}

export function demoRead(uid: number): MailFull {
  const m = DEMO_MAIL.find((x) => x.uid === uid) ?? DEMO_MAIL[0];
  return { ...m, body: DEMO_BODY, html: DEMO_HTML };
}
