/**
 * Telegram client via GramJS (MTProto, personal account — NOT a bot).
 *
 * Auth is a StringSession generated once by `scripts/telegram-login.mjs` and
 * stored in TELEGRAM_SESSION. That string grants FULL access to the account, so
 * it lives only in server-side env and never leaves the API layer.
 *
 * On serverless (Vercel) there is no long-lived process: every call opens a
 * fresh MTProto connection (~1–2s), does its work, then disconnects. The UI
 * hides this behind a TTL cache + adaptive polling.
 */

// Import everything from the single "telegram" entry: subpath imports
// (telegram/sessions, telegram/extensions/…) can resolve to a second physical
// copy of the module, and then `session instanceof Session` inside the client
// fails with "Only StringSession and StoreSessions are supported".
import { TelegramClient, sessions } from "telegram";
import { LogLevel } from "telegram/extensions/Logger";

const { StringSession } = sessions;

const apiId = Number(process.env.TELEGRAM_API_ID || 0);
const apiHash = process.env.TELEGRAM_API_HASH || "";
const sessionStr = process.env.TELEGRAM_SESSION || "";

export function telegramConfigured(): boolean {
  return !!(apiId && apiHash && sessionStr);
}

/** Open a short-lived MTProto connection, run `fn`, always disconnect. */
async function withClient<T>(fn: (client: TelegramClient) => Promise<T>): Promise<T> {
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 2,
  });
  // GramJS is very chatty on stdout otherwise.
  client.setLogLevel(LogLevel.NONE);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.disconnect();
    await client.destroy().catch(() => {});
  }
}

/* ---- dialogs (recent chat list) --------------------------------------- */

export interface TgDialog {
  id: string;
  title: string;
  kind: "user" | "group" | "channel";
  unread: number;
  lastMessage: string;
  lastDate: string | null;
}

export async function fetchDialogs(limit = 30): Promise<TgDialog[]> {
  return withClient(async (client) => {
    const dialogs = await client.getDialogs({ limit });
    return dialogs
      .filter((d) => d.id)
      .map((d) => ({
        id: String(d.id),
        title: d.title || d.name || "—",
        kind: d.isChannel ? "channel" : d.isGroup ? "group" : "user",
        unread: d.unreadCount ?? 0,
        lastMessage: (d.message?.message || "").replace(/\s+/g, " ").trim(),
        lastDate: d.message?.date ? new Date(d.message.date * 1000).toISOString() : null,
      })) as TgDialog[];
  });
}

/* ---- messages of one dialog ------------------------------------------- */

export interface TgMessage {
  id: number;
  out: boolean; // true = sent by me
  author: string;
  text: string;
  date: string;
}

/**
 * Resolve a dialog to its input entity by walking the dialog list. A fresh
 * serverless invocation has no cached access hashes, so resolving a marked id
 * directly throws "Cannot cast ... to any kind of peer" — the dialog objects
 * already carry a usable inputEntity, so we match on the id string instead.
 */
async function resolvePeer(client: TelegramClient, peerId: string) {
  const dialogs = await client.getDialogs({ limit: 200 });
  const dlg = dialogs.find((d) => String(d.id) === peerId);
  if (!dlg) throw new Error("диалог не найден (возможно, вне последних 200)");
  return dlg.inputEntity;
}

export async function fetchMessages(peerId: string, limit = 40): Promise<TgMessage[]> {
  return withClient(async (client) => {
    const entity = await resolvePeer(client, peerId);
    const messages = await client.getMessages(entity, { limit });

    return messages
      .filter((m) => m.id)
      .map((m) => {
        const sender = m.sender as { firstName?: string; lastName?: string; title?: string } | undefined;
        const name = sender
          ? [sender.firstName, sender.lastName].filter(Boolean).join(" ") || sender.title || ""
          : "";
        return {
          id: m.id,
          out: !!m.out,
          author: m.out ? "Вы" : name || "—",
          text: m.message || (m.media ? "[вложение]" : ""),
          date: m.date ? new Date(m.date * 1000).toISOString() : new Date().toISOString(),
        };
      })
      .sort((a, b) => a.id - b.id);
  });
}

/* ---- send ------------------------------------------------------------- */

export async function sendMessage(peerId: string, text: string): Promise<{ id: number }> {
  return withClient(async (client) => {
    const entity = await resolvePeer(client, peerId);
    const res = await client.sendMessage(entity, { message: text });
    return { id: res.id };
  });
}
