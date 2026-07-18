/**
 * Tool-calling assistant core — shared by the workspace chat and the Telegram
 * bot webhook. The model is given a set of read/write tools over the same data
 * the aggregator already exposes (Notion, Telegram, tasks, events, notes) and
 * decides itself when to call them, in a loop, until it produces a final reply.
 *
 * Everything here is server-side only (Supabase service key, Notion/TG tokens).
 * If the configured model can't do function-calling we degrade gracefully to a
 * plain completion (see `runAssistant`).
 */

import {
  chatWithTools,
  chatAI,
  isToolUnsupportedError,
  type ToolDef,
  type ToolCall,
  type AgentMessage,
} from "@/lib/ai";
import { supabaseConfigured, sbSelect, sbInsert, sbUpdate } from "@/lib/supabase";
import { notionConnected, searchNotion, pageContent, createPage } from "@/lib/notion";
import { telegramConfigured, fetchDialogs, fetchMessageHistory } from "@/lib/telegram";
import type { Priority } from "@/lib/workspace";

const MAX_STEPS = 5;

const PRIORITIES = ["none", "low", "medium", "high"] as const;
function asPriority(v: unknown): Priority {
  return (PRIORITIES as readonly string[]).includes(v as string) ? (v as Priority) : "none";
}

/* ---- tool implementations --------------------------------------------- */

type Handler = (args: Record<string, unknown>) => Promise<string>;

interface Tool {
  def: ToolDef;
  run: Handler;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const TOOLS: Tool[] = [
  {
    def: {
      name: "search_notion",
      description: "Найти страницы и базы в Notion по ключевым словам. Возвращает заголовки и типы.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Поисковый запрос; пусто — недавние." } },
      },
    },
    async run(a) {
      if (!(await notionConnected())) return "Notion не подключён.";
      const hits = await searchNotion(str(a.query), 12);
      if (!hits.length) return "Ничего не найдено.";
      return hits.map((h) => `- ${h.title}${h.type === "database" ? " [база]" : ""}`).join("\n");
    },
  },
  {
    def: {
      name: "read_notion_page",
      description: "Прочитать полный текст страницы Notion. Ищет страницу по названию.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Название страницы." } },
        required: ["query"],
      },
    },
    async run(a) {
      if (!(await notionConnected())) return "Notion не подключён.";
      const q = str(a.query);
      const pages = (await searchNotion(q, 10)).filter((h) => h.type === "page");
      if (!pages.length) return `Страница «${q}» не найдена.`;
      const ql = q.toLowerCase();
      const best =
        pages.find((p) => p.title.toLowerCase() === ql) ??
        pages.filter((p) => p.title.toLowerCase().includes(ql)).sort((a, b) => a.title.length - b.title.length)[0] ??
        pages[0];
      const { title, markdown } = await pageContent(best.id);
      return `«${title}»:\n${markdown ? markdown.slice(0, 6000) : "(пусто)"}`;
    },
  },
  {
    def: {
      name: "read_telegram_chat",
      description: "Прочитать последние сообщения из чата Telegram. Ищет чат по названию.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Название чата/имя собеседника." },
          limit: { type: "number", description: "Сколько сообщений (по умолчанию 30, макс 100)." },
        },
        required: ["query"],
      },
    },
    async run(a) {
      if (!telegramConfigured()) return "Telegram не подключён.";
      const q = str(a.query).toLowerCase();
      const limit = Math.min(Math.max(Number(a.limit) || 30, 1), 100);
      const dialogs = await fetchDialogs(2000);
      const exact = dialogs.find((d) => d.title.toLowerCase() === q);
      const partial = dialogs.filter((d) => d.title.toLowerCase().includes(q)).sort((x, y) => x.title.length - y.title.length);
      const dlg = exact ?? partial[0];
      if (!dlg) return `Чат «${str(a.query)}» не найден.`;
      const msgs = await fetchMessageHistory(dlg.id, limit);
      if (!msgs.length) return `В «${dlg.title}» сообщений нет.`;
      return `«${dlg.title}»:\n` + msgs.map((m) => `${m.author}: ${(m.text || "[медиа]").replace(/\s+/g, " ").slice(0, 400)}`).join("\n");
    },
  },
  {
    def: {
      name: "create_task",
      description: "Создать задачу в списке задач.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
          due: { type: "string", description: "Дедлайн YYYY-MM-DD (опционально)." },
        },
        required: ["title"],
      },
    },
    async run(a) {
      const title = str(a.title);
      if (!supabaseConfigured()) return "Supabase не настроен — не могу сохранить.";
      if (!title) return "Пустое название задачи.";
      await sbInsert("ws_tasks", {
        title: title.slice(0, 500),
        priority: asPriority(a.priority),
        done: false,
        status: "todo",
        due: str(a.due) || null,
        color: "",
      });
      return `Задача создана: «${title}».`;
    },
  },
  {
    def: {
      name: "complete_task",
      description: "Отметить задачу выполненной. Ищет задачу по названию.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    },
    async run(a) {
      const title = str(a.title);
      if (!supabaseConfigured()) return "Supabase не настроен.";
      if (!title) return "Не указано название.";
      const rows = await sbSelect<{ id: string; title: string }>(
        "ws_tasks",
        `select=id,title&done=eq.false&title=ilike.*${encodeURIComponent(title)}*&limit=2`,
      );
      if (!rows.length) return `Открытая задача «${title}» не найдена.`;
      if (rows.length > 1) return `Нашлось несколько задач по «${title}» — уточни название.`;
      await sbUpdate("ws_tasks", `id=eq.${rows[0].id}`, { done: true, status: "done" });
      return `Задача «${rows[0].title}» закрыта.`;
    },
  },
  {
    def: {
      name: "create_event",
      description: "Добавить событие в календарь.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "Дата YYYY-MM-DD." },
          time: { type: "string", description: "Время HH:MM (опционально)." },
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
        },
        required: ["title", "date"],
      },
    },
    async run(a) {
      const title = str(a.title);
      const date = str(a.date);
      if (!supabaseConfigured()) return "Supabase не настроен.";
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Нужны название и дата в формате YYYY-MM-DD.";
      await sbInsert("ws_events", {
        title: title.slice(0, 500),
        date,
        time: str(a.time) || null,
        note: null,
        priority: asPriority(a.priority),
        color: "",
      });
      return `Событие создано: «${title}» на ${date}${str(a.time) ? ` ${str(a.time)}` : ""}.`;
    },
  },
  {
    def: {
      name: "create_note",
      description: "Сохранить заметку.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
        },
        required: ["title"],
      },
    },
    async run(a) {
      const title = str(a.title);
      if (!supabaseConfigured()) return "Supabase не настроен.";
      if (!title) return "Пустой заголовок заметки.";
      await sbInsert("ws_notes", {
        title: title.slice(0, 500),
        body: str(a.body).slice(0, 5000),
        priority: asPriority(a.priority),
        color: "",
      });
      return `Заметка сохранена: «${title}».`;
    },
  },
  {
    def: {
      name: "create_notion_page",
      description: "Создать страницу в Notion внутри существующей родительской страницы (ищется по названию).",
      parameters: {
        type: "object",
        properties: {
          parent_query: { type: "string", description: "Название родительской страницы." },
          title: { type: "string" },
          markdown: { type: "string", description: "Содержимое (абзацы через пустую строку)." },
        },
        required: ["parent_query", "title"],
      },
    },
    async run(a) {
      if (!(await notionConnected())) return "Notion не подключён.";
      const parentQ = str(a.parent_query);
      const title = str(a.title);
      if (!parentQ || !title) return "Нужны родительская страница и заголовок.";
      const parents = (await searchNotion(parentQ, 10)).filter((h) => h.type === "page");
      if (!parents.length) return `Родительская страница «${parentQ}» не найдена.`;
      const parent = parents[0];
      const res = await createPage({ parentPageId: parent.id, title, markdown: str(a.markdown) || undefined });
      return `Страница «${title}» создана в «${parent.title}»${res.url ? ` (${res.url})` : ""}.`;
    },
  },
];

const TOOL_MAP = new Map(TOOLS.map((t) => [t.def.name, t]));

/* ---- system prompt ---------------------------------------------------- */

/** Build the shared assistant system prompt around a pre-collected context. */
export function buildAssistantSystem(today: string, context: string, extra = ""): string {
  return `Ты — личный ассистент владельца рабочего кабинета. Сегодня ${today}.
Тебе доступна актуальная сводка из его задач, календаря, Bitrix, Notion, Telegram, почты и свежих новостей — ниже.
Отвечай кратко, по делу, на русском. Если данных не хватает — используй инструменты, не выдумывай.

У тебя есть ИНСТРУМЕНТЫ — вызывай их сам, когда нужно:
- чтение: search_notion, read_notion_page, read_telegram_chat (для полного текста страниц и истории чатов — в сводке только заголовки);
- запись: create_task, complete_task, create_event, create_note, create_notion_page.
Меняй данные (создание/закрытие) только когда пользователь явно об этом просит. После действия коротко подтверди результат.

=== АКТУАЛЬНЫЕ ДАННЫЕ ===
${context || "(пока пусто — источники не подключены или нет свежих данных)"}
${extra ? `\n\n=== ДОПОЛНИТЕЛЬНО ===\n${extra}` : ""}
=== КОНЕЦ ДАННЫХ ===`;
}

/* ---- agent loop ------------------------------------------------------- */

export interface AssistantResult {
  answer: string;
  /** Human-readable log of tools the model actually invoked. */
  actions: string[];
}

/** Run the assistant with tools. Falls back to a plain completion if the model
 *  doesn't support function-calling. */
export async function runAssistant(system: string, history: { role: "user" | "assistant"; content: string }[]): Promise<AssistantResult> {
  const messages: AgentMessage[] = [{ role: "system", content: system }, ...history];
  const actions: string[] = [];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const turn = await chatWithTools(messages, TOOLS.map((t) => t.def));
      if (!turn.toolCalls.length) {
        return { answer: turn.content || "…", actions };
      }
      messages.push(turn.raw);
      for (const call of turn.toolCalls) {
        const result = await runTool(call);
        actions.push(result.log);
        messages.push({ role: "tool", tool_call_id: call.id, content: result.output });
      }
    }
    // Ran out of steps: ask for a final answer without more tools.
    const last = await chatAI(
      messages.map((m) => (m.role === "tool" ? { role: "user" as const, content: `[tool] ${m.content}` } : m)) as never,
    );
    return { answer: last, actions };
  } catch (e) {
    if (isToolUnsupportedError(e)) {
      // Model can't call tools — answer from the pre-built context alone.
      const answer = await chatAI([{ role: "system", content: system }, ...history]);
      return { answer, actions };
    }
    throw e;
  }
}

async function runTool(call: ToolCall): Promise<{ output: string; log: string }> {
  const tool = TOOL_MAP.get(call.name);
  if (!tool) return { output: `Неизвестный инструмент ${call.name}`, log: `✗ ${call.name} (нет такого)` };
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.arguments || "{}");
  } catch {
    return { output: "Не удалось разобрать аргументы (нужен JSON).", log: `✗ ${call.name} (плохие аргументы)` };
  }
  try {
    const output = await tool.run(args);
    return { output, log: `→ ${call.name}` };
  } catch (e) {
    const msg = (e as Error).message;
    return { output: `Ошибка: ${msg}`, log: `✗ ${call.name}: ${msg}` };
  }
}
