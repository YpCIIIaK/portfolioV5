import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, askAI } from "@/lib/ai";
import { supabaseConfigured, sbSelect } from "@/lib/supabase";
import { bitrixConfigured, fetchTasks } from "@/lib/bitrix";
import { telegramConfigured, fetchDialogs } from "@/lib/telegram";
import { mailConfigured, fetchInbox } from "@/lib/mail-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Owner-only "morning brief": pulls a COMPACT snapshot from every connected
 * source (titles / short previews only — never full bodies) and asks the model
 * to prioritize what needs attention today. Cached server-side to spare tokens.
 */

const TTL = 30 * 60 * 1000; // 30 min
let cache: { at: number; data: unknown } | null = null;

interface WsTask { title: string; due: string | null; priority: string; done: boolean }
interface WsEvent { title: string; date: string; time: string | null }

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function collectContext(): Promise<string> {
  const parts: string[] = [];

  // Personal tasks (Supabase)
  if (supabaseConfigured()) {
    try {
      const tasks = await sbSelect<WsTask>("ws_tasks", "select=title,due,priority,done&done=eq.false&order=due.asc&limit=20");
      if (tasks.length) parts.push("ЗАДАЧИ (открытые):\n" + tasks.map((t) => `- ${t.title}${t.due ? ` (до ${t.due})` : ""}${t.priority !== "none" ? ` [${t.priority}]` : ""}`).join("\n"));
    } catch { /* skip */ }
    try {
      const events = await sbSelect<WsEvent>("ws_events", `select=title,date,time&date=gte.${todayISO()}&order=date.asc&limit=15`);
      if (events.length) parts.push("КАЛЕНДАРЬ (ближайшее):\n" + events.map((e) => `- ${e.date}${e.time ? ` ${e.time}` : ""} — ${e.title}`).join("\n"));
    } catch { /* skip */ }
  }

  // Bitrix tasks
  if (bitrixConfigured()) {
    try {
      const bx = await fetchTasks(15);
      if (bx.length) parts.push("BITRIX ЗАДАЧИ:\n" + bx.map((t) => `- ${t.title} (${t.status}${t.deadline ? `, до ${t.deadline}` : ""})`).join("\n"));
    } catch { /* skip */ }
  }

  // Telegram unread
  if (telegramConfigured()) {
    try {
      const dialogs = await fetchDialogs(30);
      const unread = dialogs.filter((d) => d.unread > 0).slice(0, 12);
      if (unread.length) parts.push("TELEGRAM (непрочитанное):\n" + unread.map((d) => `- ${d.title} (${d.unread}): ${d.lastMessage.slice(0, 80)}`).join("\n"));
    } catch { /* skip */ }
  }

  // Mail unread (headers only)
  if (mailConfigured()) {
    try {
      const mail = await fetchInbox(15);
      const unread = mail.filter((m) => m.unread).slice(0, 12);
      if (unread.length) parts.push("ПОЧТА (непрочитанное):\n" + unread.map((m) => `- ${m.from}: ${m.subject}`).join("\n"));
    } catch { /* skip */ }
  }

  return parts.join("\n\n");
}

const SYSTEM = `Ты — личный ассистент-секретарь. На вход даётся сводка из задач, календаря, Bitrix, Telegram и почты владельца.
Твоя задача — кратко и по делу сказать, на что обратить внимание СЕГОДНЯ. Правила:
- Пиши на русском, живо, без воды и без markdown-заголовков.
- Сначала 1–2 предложения общей картины.
- Затем список "Приоритеты:" из 3–6 пунктов, самое срочное сверху (просрочки, дедлайны сегодня, ждущие ответа люди).
- Если что-то ждёт ответа в почте/Telegram — так и скажи.
- Не выдумывай того, чего нет в данных. Если данных мало — так и напиши.`;

export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ ...(cache.data as object), cached: true });
  }

  try {
    const context = await collectContext();
    if (!context.trim()) {
      const data = { brief: "Пока нет данных для брифинга — подключи задачи, календарь, Bitrix, Telegram или почту.", generatedAt: new Date().toISOString() };
      cache = { at: Date.now(), data };
      return NextResponse.json(data);
    }
    const brief = await askAI(`Вот сводка на ${todayISO()}:\n\n${context}`, { system: SYSTEM, maxTokens: 600 });
    const data = { brief, generatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
