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
import { TelegramClient, sessions, client as gram } from "telegram";
import { LogLevel } from "telegram/extensions/Logger";

const { StringSession } = sessions;
const { CustomFile } = gram.uploads;

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
    // folder: 0 = main list only (chats that belong to no folder). Telegram puts
    // archived chats in folder 1, so this drops the archive. Custom folders
    // (chat filters) are a separate mechanism and are not filtered here.
    const dialogs = await client.getDialogs({ limit, archived: false });
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

export type MediaDisplay = "image" | "video" | "audio";

export interface TgMedia {
  kind: string; // photo | video | videoNote | gif | sticker | voice | audio | file
  display: MediaDisplay; // how the client should render it inline
}

export interface TgMessage {
  id: number;
  out: boolean; // true = sent by me
  author: string;
  text: string;
  date: string;
  media: TgMedia | null; // set when the attachment can be rendered inline
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

/** Structural view of a GramJS message's media getters (all optional). */
type MediaMsg = {
  photo?: unknown; video?: unknown; videoNote?: unknown; voice?: unknown;
  audio?: unknown; gif?: unknown; sticker?: unknown; document?: unknown;
  contact?: unknown; geo?: unknown; venue?: unknown; poll?: unknown;
  dice?: unknown; webPreview?: unknown; media?: unknown;
};

/** Human badge for an attachment. Order matters (more specific kinds first). */
function mediaLabel(m: MediaMsg): string {
  if (m.sticker) return "🎯 [стикер]";
  if (m.gif) return "🎞️ [GIF]";
  if (m.photo) return "🖼️ [фото]";
  if (m.videoNote) return "⭕ [видео-кружок]";
  if (m.video) return "🎬 [видео]";
  if (m.voice) return "🎤 [голосовое]";
  if (m.audio) return "🎵 [аудио]";
  if (m.contact) return "👤 [контакт]";
  if (m.venue || m.geo) return "📍 [геолокация]";
  if (m.poll) return "📊 [опрос]";
  if (m.dice) return "🎲 [дайс]";
  if (m.document) return "📎 [файл]";
  // Any other media that isn't just a link preview.
  if (m.media && !m.webPreview) return "📎 [вложение]";
  return "";
}

/** Short kind slug for a media message. */
function mediaKind(m: MediaMsg): string {
  if (m.sticker) return "sticker";
  if (m.gif) return "gif";
  if (m.photo) return "photo";
  if (m.videoNote) return "videoNote";
  if (m.video) return "video";
  if (m.voice) return "voice";
  if (m.audio) return "audio";
  if (m.document) return "file";
  return "other";
}

/** How the browser should render this attachment inline, or null (label only). */
function mediaDisplay(m: MediaMsg): MediaDisplay | null {
  if (m.photo || m.sticker) return "image";
  if (m.video || m.videoNote || m.gif) return "video";
  if (m.voice || m.audio) return "audio";
  return null;
}

export async function fetchMessages(peerId: string, limit = 40, offsetId = 0): Promise<TgMessage[]> {
  return withClient(async (client) => {
    const entity = await resolvePeer(client, peerId);
    // offsetId > 0 pages backwards: returns messages strictly older than it.
    const messages = await client.getMessages(entity, offsetId ? { limit, offsetId } : { limit });

    return messages
      .filter((m) => m.id)
      .map((m) => {
        const sender = m.sender as { firstName?: string; lastName?: string; title?: string } | undefined;
        const name = sender
          ? [sender.firstName, sender.lastName].filter(Boolean).join(" ") || sender.title || ""
          : "";
        const mm = m as unknown as MediaMsg;
        const display = mediaDisplay(mm);
        // When we can render the media inline, text is just the caption.
        // Otherwise fall back to a typed badge (+ caption) as before.
        const text = display
          ? m.message || ""
          : [mediaLabel(mm), m.message].filter(Boolean).join(" ").trim();
        return {
          id: m.id,
          out: !!m.out,
          author: m.out ? "Вы" : name || "—",
          text,
          date: m.date ? new Date(m.date * 1000).toISOString() : new Date().toISOString(),
          media: display ? { kind: mediaKind(mm), display } : null,
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

/* ---- send files (photos / videos / documents, album for multiple) ----- */

export interface UploadFile {
  name: string;
  data: Uint8Array;
}

export async function sendFiles(peerId: string, files: UploadFile[], caption: string): Promise<{ id: number }> {
  return withClient(async (client) => {
    const entity = await resolvePeer(client, peerId);
    // CustomFile wraps in-memory bytes; the name's extension lets GramJS decide
    // photo/video vs. document. Multiple files go as an album.
    const wrapped = files.map((f) => new CustomFile(f.name || "file", f.data.byteLength, "", Buffer.from(f.data)));
    const res = await client.sendFile(entity, {
      file: wrapped.length === 1 ? wrapped[0] : wrapped,
      caption: caption || undefined,
      forceDocument: false,
      workers: 1,
    });
    const msg = res as unknown as { id: number } | { id: number }[];
    return { id: Array.isArray(msg) ? msg[0].id : msg.id };
  });
}

/* ---- media download --------------------------------------------------- */

/** Best-guess content type for a media message (falls back to the document's). */
function mediaMime(m: MediaMsg & { document?: { mimeType?: string } }): string {
  const docMime = m.document?.mimeType;
  if (m.photo) return "image/jpeg";
  if (m.sticker) return docMime || "image/webp";
  if (m.gif || m.video || m.videoNote) return docMime || "video/mp4";
  if (m.voice) return docMime || "audio/ogg";
  if (m.audio) return docMime || "audio/mpeg";
  return docMime || "application/octet-stream";
}

/**
 * Download the full media of one message. Loads the whole file into memory, so
 * it's meant for photos / short clips in a personal workspace, not huge files.
 */
export async function downloadMedia(peerId: string, msgId: number): Promise<{ data: Uint8Array; mime: string } | null> {
  return withClient(async (client) => {
    const entity = await resolvePeer(client, peerId);
    const messages = await client.getMessages(entity, { ids: [msgId] });
    const msg = messages[0];
    if (!msg || !msg.media) return null;
    const buf = await client.downloadMedia(msg, {});
    if (!buf) return null;
    const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
    return { data: bytes, mime: mediaMime(msg as unknown as MediaMsg & { document?: { mimeType?: string } }) };
  });
}
