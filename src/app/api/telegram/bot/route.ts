import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { runAssistant, buildAssistantSystem } from "@/lib/assistant-agent";
import { getSession, saveSession, clearSession, compactSession } from "@/lib/assistant-session";
import { collectContext, todayISO } from "@/lib/aggregate";
import { sendTelegram } from "@/lib/notify";

export const runtime = "nodejs";
// The agent may take a few tool-calling round-trips; give it room.
export const maxDuration = 60;

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
      await sendTelegram(await runCommand(command, chatId));
      return NextResponse.json({ ok: true });
    }

    if (!aiConfigured()) {
      await sendTelegram("AI не настроен (OPENROUTER_API_KEY).");
      return NextResponse.json({ ok: true });
    }

    const session = await getSession(chatId);
    const context = await collectContext();
    const extra = session.summary ? `ПАМЯТЬ ДИАЛОГА (сжатая):\n${session.summary}` : "";
    const system = buildAssistantSystem(todayISO(), context, extra);

    const history = [...session.messages, { role: "user" as const, content: text.slice(0, 4000) }];
    const { answer } = await runAssistant(system, history);

    await saveSession(chatId, {
      summary: session.summary,
      messages: [...history, { role: "assistant", content: answer }],
    });
    await sendTelegram(answer.slice(0, 4000));
  } catch (e) {
    await sendTelegram(`Ошибка: ${(e as Error).message}`);
  }
  return NextResponse.json({ ok: true });
}

type Command = "new" | "compact" | "help";

/** Recognize a leading slash-command (Russian and English aliases). */
function matchCommand(text: string): Command | null {
  const word = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, ""); // strip @botname
  if (["/new", "/reset", "/новая", "/новый", "/сброс"].includes(word)) return "new";
  if (["/compact", "/компакт", "/сжать"].includes(word)) return "compact";
  if (["/help", "/start", "/старт", "/помощь"].includes(word)) return "help";
  return null;
}

const HELP = [
  "Команды:",
  "/new — новая сессия (забыть контекст)",
  "/compact — сжать историю в память и очистить окно",
  "/help — эта справка",
  "",
  "Обычным сообщением — вопрос ассистенту. Он помнит диалог в рамках сессии и умеет читать Notion/Telegram и заводить задачи, события, заметки.",
].join("\n");

async function runCommand(cmd: Command, chatId: string): Promise<string> {
  if (cmd === "help") return HELP;
  if (cmd === "new") {
    await clearSession(chatId);
    return "Начал новую сессию — контекст очищен.";
  }
  // compact
  const { compacted, summary } = await compactSession(chatId);
  if (!compacted) return "Нечего сжимать — история пуста.";
  return `История сжата в память:\n\n${summary}`;
}
