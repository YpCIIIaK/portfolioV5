/**
 * Conversation memory for the Telegram assistant bot (ws_bot_session).
 *
 * Serverless has no in-process memory, so each session lives in Supabase: a
 * rolling window of recent turns plus a `summary` — the compacted long-term
 * memory the /compact command produces. One row per chat_id.
 *
 * If Supabase isn't configured the bot still works, just statelessly (every
 * message is a fresh conversation).
 */

import { supabaseConfigured, sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/supabase";
import { chatAI } from "@/lib/ai";

export interface SessionTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Session {
  summary: string;
  messages: SessionTurn[];
}

/** How many recent turns to keep verbatim before old ones are dropped. */
export const WINDOW = 16;

const EMPTY: Session = { summary: "", messages: [] };

interface SessionRow {
  chat_id: string;
  summary: string;
  messages: SessionTurn[];
}

export async function getSession(chatId: string): Promise<Session> {
  if (!supabaseConfigured()) return { ...EMPTY };
  const rows = await sbSelect<SessionRow>(
    "ws_bot_session",
    `select=summary,messages&chat_id=eq.${encodeURIComponent(chatId)}&limit=1`,
  );
  const row = rows[0];
  return row ? { summary: row.summary ?? "", messages: Array.isArray(row.messages) ? row.messages : [] } : { ...EMPTY };
}

/** Persist a session, trimming the verbatim window to the last WINDOW turns. */
export async function saveSession(chatId: string, session: Session): Promise<void> {
  if (!supabaseConfigured()) return;
  const messages = session.messages.slice(-WINDOW);
  const patch = { summary: session.summary, messages, updated_at: new Date().toISOString() };
  const updated = await sbUpdate("ws_bot_session", `chat_id=eq.${encodeURIComponent(chatId)}`, patch);
  if (!updated) {
    await sbInsert("ws_bot_session", { chat_id: chatId, ...patch }).catch(async () => {
      // Lost a race to create the row — fall back to updating it.
      await sbUpdate("ws_bot_session", `chat_id=eq.${encodeURIComponent(chatId)}`, patch);
    });
  }
}

/** Start a fresh session (drops both summary and history). */
export async function clearSession(chatId: string): Promise<void> {
  if (!supabaseConfigured()) return;
  await sbDelete("ws_bot_session", `chat_id=eq.${encodeURIComponent(chatId)}`);
}

/**
 * Compact the session: fold the current window into `summary` and clear the
 * verbatim messages. Keeps long-term memory small but preserved.
 */
export async function compactSession(chatId: string): Promise<{ compacted: boolean; summary: string }> {
  const session = await getSession(chatId);
  if (!session.messages.length) return { compacted: false, summary: session.summary };

  const transcript = session.messages.map((m) => `${m.role === "user" ? "Пользователь" : "Ассистент"}: ${m.content}`).join("\n");
  const prompt = `Сожми диалог в компактную память на русском: ключевые факты, решения, договорённости и открытые вопросы. Кратко, тезисами. Без вступлений.${
    session.summary ? `\n\nУже накопленная память:\n${session.summary}` : ""
  }\n\nНовый фрагмент диалога:\n${transcript}`;

  const summary = await chatAI([{ role: "user", content: prompt }], { maxTokens: 500 });
  const next: Session = { summary: summary.trim().slice(0, 4000), messages: [] };
  await saveSession(chatId, next);
  return { compacted: true, summary: next.summary };
}
