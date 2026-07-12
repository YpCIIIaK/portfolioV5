/**
 * Server-side aggregator: a COMPACT snapshot of every connected source
 * (tasks, calendar, Bitrix, Telegram, mail) as plain text for the AI agent.
 *
 * Only titles / short previews — never full message bodies — so the context
 * stays small and little leaks even if a provider logged it. Cached for a few
 * minutes so the brief and the chat don't re-hit every source per request.
 */

import { supabaseConfigured, sbSelect } from "@/lib/supabase";
import { bitrixConfigured, fetchTasks } from "@/lib/bitrix";
import { telegramConfigured, fetchDialogs } from "@/lib/telegram";
import { mailConfigured, fetchInbox } from "@/lib/mail-server";
import { fetchNews, formatNewsContext } from "@/lib/news";

interface WsTask { title: string; due: string | null; priority: string; done: boolean }
interface WsEvent { title: string; date: string; time: string | null }
interface WsNote { title: string; body: string; priority: string; updated_at: string }
interface WsProject { title: string; description: string; tags: string; is_public: boolean; repo_url: string | null }
interface WsSubscription { name: string; price: number; currency: string; period: string; tier: string; next_date: string | null }

const TTL = 5 * 60 * 1000; // 5 min
let cache: { at: number; text: string } | null = null;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

async function build(): Promise<string> {
  const parts: string[] = [];

  if (supabaseConfigured()) {
    try {
      const tasks = await sbSelect<WsTask>("ws_tasks", "select=title,due,priority,done&done=eq.false&order=due.asc&limit=25");
      if (tasks.length) parts.push("ЗАДАЧИ (открытые):\n" + tasks.map((t) => `- ${t.title}${t.due ? ` (до ${t.due})` : ""}${t.priority !== "none" ? ` [${t.priority}]` : ""}`).join("\n"));
    } catch { /* skip */ }
    try {
      const events = await sbSelect<WsEvent>("ws_events", `select=title,date,time&date=gte.${todayISO()}&order=date.asc&limit=20`);
      if (events.length) parts.push("КАЛЕНДАРЬ (ближайшее):\n" + events.map((e) => `- ${e.date}${e.time ? ` ${e.time}` : ""} — ${e.title}`).join("\n"));
    } catch { /* skip */ }
    try {
      const notes = await sbSelect<WsNote>("ws_notes", "select=title,body,priority,updated_at&order=updated_at.desc&limit=10");
      if (notes.length) {
        parts.push(
          "ЗАМЕТКИ (последние):\n" +
            notes
              .map((n) => `- ${n.title}${n.priority !== "none" ? ` [${n.priority}]` : ""}: ${n.body.replace(/\s+/g, " ").slice(0, 120)}`)
              .join("\n"),
        );
      }
    } catch { /* skip */ }
    try {
      const subscriptions = await sbSelect<WsSubscription>("ws_subscriptions", "select=name,price,currency,period,tier,next_date&order=next_date.asc&limit=15");
      if (subscriptions.length) {
        parts.push(
          "ПОДПИСКИ:\n" +
            subscriptions
              .map((s) => `- ${s.name}${s.tier ? ` (${s.tier})` : ""}: ${s.price}${s.currency}/${s.period}${s.next_date ? `, следующее списание ${s.next_date}` : ""}`)
              .join("\n"),
        );
      }
    } catch { /* skip */ }
    try {
      const projects = await sbSelect<WsProject>("ws_projects", "select=title,description,tags,is_public,repo_url&order=created_at.desc&limit=10");
      if (projects.length) {
        parts.push(
          "ПРОЕКТЫ:\n" +
            projects
              .map((p) => `- ${p.title}${p.is_public ? " [public]" : " [private]"}${p.tags ? ` (${p.tags})` : ""}: ${p.description.replace(/\s+/g, " ").slice(0, 120)}`)
              .join("\n"),
        );
      }
    } catch { /* skip */ }
  }

  if (bitrixConfigured()) {
    try {
      const bx = await fetchTasks(20);
      if (bx.length) parts.push("BITRIX ЗАДАЧИ:\n" + bx.map((t) => `- ${t.title} (${t.status}${t.deadline ? `, до ${t.deadline}` : ""})`).join("\n"));
    } catch { /* skip */ }
  }

  if (telegramConfigured()) {
    try {
      const dialogs = await fetchDialogs(30);
      const unread = dialogs.filter((d) => d.unread > 0).slice(0, 15);
      if (unread.length) parts.push("TELEGRAM (непрочитанное):\n" + unread.map((d) => `- ${d.title} (${d.unread}): ${d.lastMessage.slice(0, 80)}`).join("\n"));
    } catch { /* skip */ }
  }

  if (mailConfigured()) {
    try {
      const mail = await fetchInbox(200);
      const relevant = mail.filter((m) => m.unread || isToday(m.date)).slice(0, 80);
      if (relevant.length) {
        parts.push(
          "ПОЧТА (сегодня и непрочитанное):\n" +
            relevant
              .map((m) => `- ${m.unread ? "● " : ""}${m.from}: ${m.subject}`)
              .join("\n"),
        );
      }
    } catch { /* skip */ }
  }

  try {
    const news = await fetchNews();
    const newsText = formatNewsContext(news);
    if (newsText) parts.push(newsText);
  } catch { /* skip */ }

  return parts.join("\n\n");
}

/** Cached compact context. Pass force=true to rebuild immediately. */
export async function collectContext(force = false): Promise<string> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.text;
  const text = await build();
  cache = { at: Date.now(), text };
  return text;
}

export function invalidateContext(): void {
  cache = null;
}
