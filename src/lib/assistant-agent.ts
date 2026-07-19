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
import { supabaseConfigured, sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/supabase";
import { notionConnected, searchNotion, pageContent, createPage } from "@/lib/notion";
import { telegramConfigured, fetchDialogs, fetchMessageHistory } from "@/lib/telegram";
import { githubConfigured, createRepo, createIssue, listRepos } from "@/lib/github";
import { webFetch, webSearch } from "@/lib/web";
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
  {
    def: {
      name: "create_github_repo",
      description: "Создать новый репозиторий на GitHub от имени владельца. По умолчанию приватный, с README.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Имя репозитория (без пробелов)." },
          description: { type: "string", description: "Описание (опционально)." },
          private: { type: "boolean", description: "Приватный (по умолчанию true)." },
        },
        required: ["name"],
      },
    },
    async run(a) {
      if (!githubConfigured()) return "GitHub не настроен (нет GITHUB_PAT).";
      const name = str(a.name);
      if (!name) return "Не указано имя репозитория.";
      const repo = await createRepo({
        name,
        description: str(a.description),
        isPrivate: a.private === undefined ? true : !!a.private,
      });
      return `Репозиторий создан: ${repo.full_name} (${repo.private ? "приватный" : "публичный"}) — ${repo.html_url}`;
    },
  },
  {
    def: {
      name: "create_github_issue",
      description: "Создать issue в репозитории на GitHub.",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Имя репозитория («name» или «owner/name»)." },
          title: { type: "string" },
          body: { type: "string", description: "Текст issue (опционально)." },
        },
        required: ["repo", "title"],
      },
    },
    async run(a) {
      if (!githubConfigured()) return "GitHub не настроен (нет GITHUB_PAT).";
      const repo = str(a.repo);
      const title = str(a.title);
      if (!repo || !title) return "Нужны репозиторий и заголовок.";
      const issue = await createIssue({ repo, title, body: str(a.body) });
      return `Issue #${issue.number} создан: «${issue.title}» — ${issue.html_url}`;
    },
  },
  {
    def: {
      name: "list_github_repos",
      description: "Показать репозитории владельца (недавно обновлённые сверху).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Сколько (по умолчанию 20, макс 100)." } },
      },
    },
    async run(a) {
      if (!githubConfigured()) return "GitHub не настроен (нет GITHUB_PAT).";
      const repos = await listRepos(Number(a.limit) || 20);
      if (!repos.length) return "Репозиториев нет.";
      return repos
        .map((r) => `- ${r.full_name}${r.private ? " [приват]" : ""}${r.description ? ` — ${r.description}` : ""}`)
        .join("\n");
    },
  },
  {
    def: {
      name: "web_search",
      description: "Поиск в интернете. Возвращает список результатов с заголовками, ссылками и сниппетами.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Поисковый запрос." } },
        required: ["query"],
      },
    },
    async run(a) {
      const q = str(a.query);
      if (!q) return "Пустой запрос.";
      return webSearch(q);
    },
  },
  {
    def: {
      name: "web_fetch",
      description: "Прочитать содержимое веб-страницы по URL как чистый текст.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "Полный http(s) URL." } },
        required: ["url"],
      },
    },
    async run(a) {
      const url = str(a.url);
      if (!url) return "Не указан URL.";
      return webFetch(url);
    },
  },
  {
    def: {
      name: "delete_task",
      description: "Удалить задачу безвозвратно. Ищет задачу по названию.",
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
        `select=id,title&title=ilike.*${encodeURIComponent(title)}*&limit=2`,
      );
      if (!rows.length) return `Задача «${title}» не найдена.`;
      if (rows.length > 1) return `Нашлось несколько задач по «${title}» — уточни название.`;
      await sbDelete("ws_tasks", `id=eq.${rows[0].id}`);
      return `Задача «${rows[0].title}» удалена.`;
    },
  },
  {
    def: {
      name: "delete_event",
      description: "Удалить событие календаря безвозвратно. Ищет событие по названию.",
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
        "ws_events",
        `select=id,title&title=ilike.*${encodeURIComponent(title)}*&limit=2`,
      );
      if (!rows.length) return `Событие «${title}» не найдено.`;
      if (rows.length > 1) return `Нашлось несколько событий по «${title}» — уточни название.`;
      await sbDelete("ws_events", `id=eq.${rows[0].id}`);
      return `Событие «${rows[0].title}» удалено.`;
    },
  },
  {
    def: {
      name: "create_project",
      description: "Добавить проект в раздел «Проекты».",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          repo_url: { type: "string", description: "Ссылка на репозиторий (опционально)." },
          tags: { type: "string", description: "Теги через запятую (опционально)." },
          is_public: { type: "boolean", description: "Публичный (по умолчанию true)." },
        },
        required: ["title"],
      },
    },
    async run(a) {
      const title = str(a.title);
      if (!supabaseConfigured()) return "Supabase не настроен.";
      if (!title) return "Пустое название проекта.";
      await sbInsert("ws_projects", {
        title: title.slice(0, 500),
        description: str(a.description),
        repo_url: str(a.repo_url) || null,
        tags: str(a.tags),
        is_public: a.is_public === undefined ? true : !!a.is_public,
      });
      return `Проект создан: «${title}».`;
    },
  },
  {
    def: {
      name: "create_subscription",
      description: "Добавить подписку в раздел «Подписки».",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Сервис (Netflix, Claude Pro…)." },
          price: { type: "number" },
          currency: { type: "string", description: "Символ валюты: ₽ $ € ₸ (по умолчанию ₽)." },
          period: { type: "string", enum: ["monthly", "yearly"], description: "Период (по умолчанию monthly)." },
          tier: { type: "string", description: "Тариф (опционально)." },
          next_date: { type: "string", description: "Следующее списание YYYY-MM-DD (опционально)." },
        },
        required: ["name", "price"],
      },
    },
    async run(a) {
      const name = str(a.name);
      if (!supabaseConfigured()) return "Supabase не настроен.";
      if (!name) return "Не указан сервис.";
      const period = a.period === "yearly" ? "yearly" : "monthly";
      await sbInsert("ws_subscriptions", {
        name: name.slice(0, 500),
        price: Number(a.price) || 0,
        currency: str(a.currency) || "₽",
        period,
        tier: str(a.tier),
        description: "",
        next_date: str(a.next_date) || null,
      });
      return `Подписка добавлена: «${name}».`;
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
- чтение: search_notion, read_notion_page, read_telegram_chat (для полного текста страниц и истории чатов — в сводке только заголовки); web_search, web_fetch (поиск и чтение страниц в интернете); list_github_repos;
- запись в кабинет: create_task, complete_task, delete_task, create_event, delete_event, create_note, create_notion_page, create_project, create_subscription;
- GitHub: create_github_repo, create_github_issue.
Меняй данные, создавай репозитории/issue и удаляй что-либо ТОЛЬКО когда пользователь явно об этом просит. Удаление необратимо — если сомневаешься, переспроси. После действия коротко подтверди результат (для GitHub — дай ссылку).

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
