/**
 * Assistant extras: Telegram chat reads (@ / /tg) and task creation (/task, [[task:…]]).
 */

import { supabaseConfigured, sbInsert } from "@/lib/supabase";
import { telegramConfigured, fetchDialogs, fetchMessageHistory, type TgDialog } from "@/lib/telegram";
import type { Priority } from "@/lib/workspace";

const MAX_TG_MESSAGES = 100;

export interface TgReadSpec {
  query: string;
  limit: number;
}

const PRIORITY_WORDS: Record<string, Priority> = {
  none: "none",
  low: "low",
  medium: "medium",
  high: "high",
  нет: "none",
  низкий: "low",
  низк: "low",
  средний: "medium",
  средн: "medium",
  высокий: "high",
  высок: "high",
};

/** @ChatName 50 or /tg ChatName 50 or /telegram ChatName 50 */
export function parseTgReads(text: string): TgReadSpec[] {
  const out: TgReadSpec[] = [];
  const seen = new Set<string>();

  for (const m of text.matchAll(/(?:^|\s)@([^\n@]+?)\s+(\d{1,3})\b/g)) {
    const query = m[1].trim();
    const limit = Math.min(Number(m[2]), MAX_TG_MESSAGES);
    const key = query.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ query, limit });
    }
  }

  for (const m of text.matchAll(/\/(?:telegram|tg)\s+(.+?)\s+(\d{1,3})\b/gi)) {
    const query = m[1].trim();
    const limit = Math.min(Number(m[2]), MAX_TG_MESSAGES);
    const key = query.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ query, limit });
    }
  }

  return out;
}

function findDialog(dialogs: TgDialog[], query: string): TgDialog | null {
  const q = query.toLowerCase().trim();
  const exact = dialogs.find((d) => d.title.toLowerCase() === q);
  if (exact) return exact;
  const partial = dialogs.filter((d) => d.title.toLowerCase().includes(q));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    return partial.sort((a, b) => a.title.length - b.title.length)[0];
  }
  return null;
}

function formatMessages(title: string, msgs: { author: string; text: string; date: string; out: boolean }[]): string {
  const lines = msgs.map((m) => {
    const t = new Date(m.date);
    const when = Number.isNaN(t.getTime())
      ? ""
      : t.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const body = (m.text || "[медиа]").replace(/\s+/g, " ").slice(0, 500);
    return `[${when}] ${m.author}: ${body}`;
  });
  return `TELEGRAM «${title}» (последние ${msgs.length}):\n${lines.join("\n")}`;
}

/** Fetch and format Telegram history for assistant context. */
export async function buildTgContext(specs: TgReadSpec[]): Promise<string> {
  if (!specs.length || !telegramConfigured()) return "";
  const dialogs = await fetchDialogs(2000);
  const parts: string[] = [];

  for (const spec of specs) {
    const dlg = findDialog(dialogs, spec.query);
    if (!dlg) {
      parts.push(`TELEGRAM: чат «${spec.query}» не найден`);
      continue;
    }
    try {
      const msgs = await fetchMessageHistory(dlg.id, spec.limit);
      if (!msgs.length) parts.push(`TELEGRAM «${dlg.title}»: сообщений нет`);
      else parts.push(formatMessages(dlg.title, msgs));
    } catch {
      parts.push(`TELEGRAM «${dlg.title}»: не удалось загрузить сообщения`);
    }
  }

  return parts.join("\n\n");
}

/** /task high Title or /задача высокий Title */
export function parseUserTaskCommands(text: string): { title: string; priority: Priority }[] {
  const out: { title: string; priority: Priority }[] = [];
  for (const m of text.matchAll(/(?:^|\n)\s*(?:\/task|\/задача)\s+(?:(none|low|medium|high|нет|низкий|низк|средний|средн|высокий|высок)\s+)?(.+)/gi)) {
    const title = m[2]?.trim();
    if (!title) continue;
    const pr = PRIORITY_WORDS[(m[1] || "none").toLowerCase()] ?? "none";
    out.push({ title, priority: pr });
  }
  return out;
}

/** [[task:high]] Title — blocks emitted by the model. */
export function parseAiTaskBlocks(text: string): { title: string; priority: Priority }[] {
  const out: { title: string; priority: Priority }[] = [];
  for (const m of text.matchAll(/\[\[task:(none|low|medium|high)\]\]\s*(.+)/gi)) {
    const title = m[2].trim();
    if (title) out.push({ title, priority: (m[1].toLowerCase() as Priority) || "none" });
  }
  return out;
}

export function stripAiTaskBlocks(text: string): string {
  return text.replace(/\[\[task:(?:none|low|medium|high)\]\]\s*.+/gi, "").trim();
}

export async function createAssistantTask(title: string, priority: Priority): Promise<{ id: string; title: string; priority: Priority }> {
  if (!supabaseConfigured()) throw new Error("Supabase не настроен — задачи не сохраняются");
  const row = await sbInsert<{ id: string; title: string; priority: Priority }>("ws_tasks", {
    title: title.slice(0, 500),
    priority,
    done: false,
    status: "todo",
    due: null,
    color: "",
  });
  return row;
}

export async function createAssistantTasks(items: { title: string; priority: Priority }[]): Promise<string[]> {
  const notes: string[] = [];
  for (const item of items) {
    try {
      await createAssistantTask(item.title, item.priority);
      notes.push(`✓ Задача «${item.title}» (${item.priority})`);
    } catch (e) {
      notes.push(`✗ «${item.title}»: ${(e as Error).message}`);
    }
  }
  return notes;
}

export function priorityLabel(p: Priority): string {
  return ({ none: "без приоритета", low: "низкий", medium: "средний", high: "высокий" } as const)[p];
}
