import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { runAssistant, buildAssistantSystem } from "@/lib/assistant-agent";
import { getSession, saveSession, clearSession, compactSession, WINDOW } from "@/lib/assistant-session";
import { collectContext, todayISO } from "@/lib/aggregate";
import { sendTelegram, sendTelegramTyping } from "@/lib/notify";

export const runtime = "nodejs";
// Агент делает несколько round-trip'ов, а пересбор мозга читает все источники и
// ждёт модель минутами — 60с не хватало, берём максимум Fluid.
export const maxDuration = 300;

/**
 * Inbound Telegram bot webhook — the assistant as a chat you can message from
 * your phone, with per-chat session memory. Reuses the SAME agent core as the
 * workspace chat.
 *
 * Commands (full control over the conversation):
 *   /new  (/новая, /reset)  — начать новую сессию (забыть контекст)
 *   /compact (/компакт)     — сжать историю в память и очистить окно
 *   /help (/start)          — список команд
 *
 * Security: Telegram signs each request with the secret set at setWebhook time
 * (`X-Telegram-Bot-Api-Secret-Token`), and we only answer the owner's own chat
 * (TELEGRAM_CHAT_ID). Anything else is silently acknowledged and dropped.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: true }); // don't reveal the endpoint
  }

  const update = (await req.json().catch(() => null)) as {
    message?: { text?: string; chat?: { id?: number | string } };
  } | null;

  const msg = update?.message;
  const text = msg?.text?.trim();
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : "";
  const owner = process.env.TELEGRAM_CHAT_ID;

  // Only the owner, only real text. Always 200 so Telegram stops retrying.
  if (!text || !owner || chatId !== String(owner)) return NextResponse.json({ ok: true });

  try {
    const command = matchCommand(text);
    if (command) {
      await sendTelegram(await runCommand(command, chatId), "markdown");
      return NextResponse.json({ ok: true });
    }

    if (!aiConfigured()) {
      await sendTelegram("AI не настроен (OPENROUTER_API_KEY).");
      return NextResponse.json({ ok: true });
    }

    await sendTelegramTyping(); // сразу показываем, что запрос принят

    const session = await getSession(chatId);
    const context = await collectContext();
    const extra = session.summary ? `ПАМЯТЬ ДИАЛОГА (сжатая):\n${session.summary}` : "";
    const system = buildAssistantSystem(todayISO(), context, extra);

    const history = [...session.messages, { role: "user" as const, content: text.slice(0, 4000) }];
    const { answer } = await runAssistant(system, history, {
      // Долгие инструменты объявляем вслух, чтобы не гадать «работает или упал».
      async onToolStart(name, args) {
        await sendTelegramTyping();
        const note = progressNote(name, args);
        if (note) await sendTelegram(note);
      },
      async onToolEnd(name, ok) {
        if (!ok && SLOW_TOOLS[name]) await sendTelegram(`⚠️ ${SLOW_TOOLS[name].done} — не получилось, подробности в ответе ниже.`);
        else if (ok && SLOW_TOOLS[name]) await sendTelegram(`✅ ${SLOW_TOOLS[name].done}`);
      },
    });

    await saveSession(chatId, {
      summary: session.summary,
      messages: [...history, { role: "assistant", content: answer }],
    });
    // Без обрезки: длинный ответ sendTelegram сам разложит по нескольким сообщениям.
    await sendTelegram(answer, "markdown");
  } catch (e) {
    await sendTelegram(`❌ Не смог выполнить: ${(e as Error).message}\n\nПопробуй повторить или напиши /new, чтобы начать сессию заново.`);
  }
  return NextResponse.json({ ok: true });
}

/**
 * Инструменты, о которых стоит отчитаться вслух: они идут секунды-минуты, и без
 * сообщения непонятно, работает бот или отвалился. `start` — при запуске,
 * `done` — при завершении. Быстрые инструменты сюда не попадают, чтобы не спамить.
 */
const SLOW_TOOLS: Record<string, { start: string; done: string }> = {
  rebuild_brain: { start: "🧠 Пересобираю мозг с нуля — это 1–3 минуты, жду модель…", done: "Мозг пересобран" },
  augment_brain: { start: "🧠 Дополняю мозг новым из источников…", done: "Мозг дополнен" },
  expand_brain_category: { start: "🧠 Детализирую мозг…", done: "Детализация готова" },
  read_brain: { start: "🧠 Читаю мозг…", done: "Мозг прочитан" },
  search_brain: { start: "🔍 Ищу в мозге…", done: "Поиск по мозгу готов" },
  create_diagram: { start: "📊 Рисую диаграмму…", done: "Диаграмма создана" },
  read_notion_page: { start: "📄 Читаю страницу Notion…", done: "Страница прочитана" },
  search_notion: { start: "🔎 Ищу в Notion…", done: "Поиск в Notion готов" },
  read_telegram_chat: { start: "💬 Читаю историю чата…", done: "Чат прочитан" },
  web_search: { start: "🌐 Ищу в интернете…", done: "Поиск готов" },
  web_fetch: { start: "🌐 Читаю страницу…", done: "Страница прочитана" },
  create_github_repo: { start: "🐙 Создаю репозиторий на GitHub…", done: "Репозиторий создан" },
  create_github_issue: { start: "🐙 Создаю issue…", done: "Issue создан" },
};

/** Текст стартового уведомления с уточнением из аргументов, если оно полезно. */
function progressNote(name: string, args: Record<string, unknown>): string {
  const slow = SLOW_TOOLS[name];
  if (!slow) return "";
  const hint = typeof args.category === "string" ? args.category
    : typeof args.query === "string" ? args.query
    : typeof args.title === "string" ? args.title
    : "";
  return hint ? `${slow.start} (${hint})` : slow.start;
}

type Command = "new" | "compact" | "help" | "status";

/** Recognize a leading slash-command (Russian and English aliases). */
function matchCommand(text: string): Command | null {
  const word = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, ""); // strip @botname
  if (["/new", "/reset", "/новая", "/новый", "/сброс"].includes(word)) return "new";
  if (["/compact", "/компакт", "/сжать"].includes(word)) return "compact";
  if (["/status", "/статус", "/стат"].includes(word)) return "status";
  if (["/help", "/start", "/старт", "/помощь"].includes(word)) return "help";
  return null;
}

const HELP = [
  "Команды:",
  "/new — новая сессия (забыть контекст)",
  "/compact — сжать историю в память и очистить окно",
  "/status — статус сессии (сообщения, память, размер контекста)",
  "/help — эта справка",
  "",
  "Обычным сообщением — вопрос ассистенту. Он помнит диалог в рамках сессии и умеет читать Notion/Telegram и заводить задачи, события, заметки.",
].join("\n");

/** ≈ токены: грубая оценка по символам (~4 симв./токен). */
const approxTokens = (chars: number) => Math.round(chars / 4);

async function runCommand(cmd: Command, chatId: string): Promise<string> {
  if (cmd === "help") return HELP;
  if (cmd === "status") return statusReport(chatId);
  if (cmd === "new") {
    await clearSession(chatId);
    return "Начал новую сессию — контекст очищен.";
  }
  // compact
  const { compacted, summary } = await compactSession(chatId);
  if (!compacted) return "Нечего сжимать — история пуста.";
  return `История сжата в память:\n\n${summary}`;
}

/** Human-readable snapshot of the current session's footprint. */
async function statusReport(chatId: string): Promise<string> {
  const session = await getSession(chatId);
  const msgs = session.messages;
  const users = msgs.filter((m) => m.role === "user").length;
  const assistants = msgs.filter((m) => m.role === "assistant").length;

  const msgChars = msgs.reduce((n, m) => n + m.content.length, 0);
  const summaryChars = session.summary.length;
  const totalChars = msgChars + summaryChars;

  return [
    "📊 Статус сессии",
    "",
    `💬 Сообщений в окне: ${msgs.length} (ты: ${users}, ассистент: ${assistants})`,
    `📦 Окно контекста: ${msgs.length}/${WINDOW} реплик`,
    `🧠 Сжатая память: ${summaryChars ? `${summaryChars} симв.` : "пусто"}`,
    `📏 Размер контекста: ~${approxTokens(totalChars)} токенов (${totalChars} симв.)`,
    "",
    msgs.length >= WINDOW
      ? "⚠️ Окно заполнено — старые реплики вытесняются. /compact сожмёт историю в память."
      : "Команды: /compact — сжать, /new — начать заново.",
  ].join("\n");
}
