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
  body: string;
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
  return { ...m, body: DEMO_BODY };
}
