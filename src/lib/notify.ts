/**
 * Outbound notifications — server-side only.
 *
 * One place that knows how to reach the owner across channels. Currently:
 *   • Telegram bot  (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
 *   • email via Resend (RESEND_API_KEY, NOTIFY_EMAIL, RESEND_FROM)
 *
 * Every channel is independent and best-effort: a failure in one never blocks
 * the others, and missing config simply skips that channel. Mirrors the setup
 * already used for visit notifications so no new env vars are required.
 */

export interface NotifyResult {
  telegram: boolean;
  email: boolean;
}

export function telegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** Escape the three characters Telegram's HTML parse mode cares about. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Convert the common Markdown the assistant emits into Telegram-flavoured HTML.
 *
 * Telegram's MarkdownV2 is unusably strict (every `.`, `-`, `!`… must be
 * escaped), so we target its HTML mode instead — a small, forgiving tag set.
 * Code spans/blocks are pulled out first so their contents are never treated
 * as formatting, then inline styles are applied to the escaped remainder.
 */
export function mdToTelegramHtml(md: string): string {
  const blocks: string[] = [];
  const stash = (html: string) => `\u0000${blocks.push(html) - 1}\u0000`;

  let out = md;
  // Fenced code blocks ```lang\n...```
  out = out.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_m, code) =>
    stash(`<pre>${escapeHtml(code.replace(/\n$/, ""))}</pre>`),
  );
  // Inline code `...`
  out = out.replace(/`([^`\n]+)`/g, (_m, code) => stash(`<code>${escapeHtml(code)}</code>`));

  out = escapeHtml(out);

  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
  // Headings -> bold line
  out = out.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");
  // Bold **x** or __x__
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/__([^_\n]+)__/g, "<b>$1</b>");
  // Italic *x* or _x_
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/(^|[^_])_([^_\n]+)_/g, "$1<i>$2</i>");
  // Bullet markers -> •
  out = out.replace(/^\s*[-*]\s+/gm, "• ");

  // Restore stashed code blocks
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => blocks[Number(i)]);
  return out;
}

/** Лимит Telegram — 4096 символов. Берём с запасом: markdown→HTML раздувает текст тегами. */
const TG_LIMIT = 3500;

/**
 * Режем длинный ответ на части, влезающие в одно сообщение Telegram.
 *
 * Рвём по границам смысла — сначала абзацы, потом строки, потом слова, — чтобы
 * фраза не обрывалась на полуслове. Блоки кода отслеживаем: если часть
 * заканчивается внутри ```-ограждения, закрываем его и переоткрываем в
 * следующей, иначе Telegram увидит незакрытый тег и потеряет форматирование.
 */
export function splitForTelegram(text: string, limit = TG_LIMIT): string[] {
  if (text.length <= limit) return [text];

  const parts: string[] = [];
  let buf = "";
  let fence = ""; // непустая — мы внутри блока кода, храним его открывающую строку

  const flush = () => {
    if (!buf.trim()) { buf = ""; return; }
    parts.push(fence ? `${buf}\n\`\`\`` : buf);
    buf = fence ? `${fence}\n` : "";
  };

  for (const line of text.split("\n")) {
    // Строка длиннее лимита (длинный URL, минифицированный JSON) — рубим жёстко.
    const pieces = line.length > limit ? hardWrap(line, limit - (fence ? 8 : 0)) : [line];
    for (const piece of pieces) {
      if (buf.length + piece.length + 1 > limit) flush();
      buf += (buf && !buf.endsWith("\n") ? "\n" : "") + piece;
    }
    if (/^\s*```/.test(line)) fence = fence ? "" : line.trimEnd();
  }
  if (buf.trim()) parts.push(fence ? `${buf}\n\`\`\`` : buf);
  return parts.length ? parts : [text.slice(0, limit)];
}

/** Разрезать сверхдлинную строку по словам, а если слов нет — по символам. */
function hardWrap(line: string, limit: number): string[] {
  const out: string[] = [];
  let rest = line;
  while (rest.length > limit) {
    const cut = rest.lastIndexOf(" ", limit);
    const at = cut > limit * 0.6 ? cut : limit; // пробел слишком рано — рубим по символам
    out.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Send a message to the owner's Telegram. Returns success.
 *
 * `format: "markdown"` runs the text through {@link mdToTelegramHtml} and sends
 * with HTML parse mode; the default is plain text (no parsing).
 *
 * Длинный текст уходит НЕСКОЛЬКИМИ сообщениями подряд (Telegram не принимает
 * больше 4096 символов), последовательно — чтобы порядок в чате не перепутался.
 */
export async function sendTelegram(
  text: string,
  format: "plain" | "markdown" = "plain",
  chatOverride?: string,
): Promise<boolean> {
  const chunks = splitForTelegram(text);
  if (chunks.length > 1) {
    let ok = true;
    for (const chunk of chunks) ok = (await sendTelegramChunk(chunk, format, chatOverride)) && ok;
    return ok;
  }
  return sendTelegramChunk(text, format, chatOverride);
}

/** Одно сообщение — без нарезки (текст уже гарантированно влезает). */
async function sendTelegramChunk(
  text: string,
  format: "plain" | "markdown" = "plain",
  chatOverride?: string,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatOverride?.trim() || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const send = (body: Record<string, unknown>) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, disable_web_page_preview: true, ...body }),
    });
  try {
    if (format === "markdown") {
      const res = await send({ text: mdToTelegramHtml(text), parse_mode: "HTML" });
      if (res.ok) return true;
      // Malformed HTML (rare) — fall back to raw text so the message still lands.
      return (await send({ text })).ok;
    }
    return (await send({ text })).ok;
  } catch (err) {
    console.error("telegram failed", err);
    return false;
  }
}

/**
 * Show the «печатает…» indicator in the owner's chat. Telegram clears it after
 * ~5 s or when a message arrives, so call it before each slow step.
 */
export async function sendTelegramTyping(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, action: "typing" }),
    });
  } catch { /* индикатор — не повод падать */ }
}

/** Send an email to the owner via Resend. Returns success. */
export async function sendEmail(subject: string, text: string, from?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from ?? process.env.RESEND_FROM ?? "Portfolio <onboarding@resend.dev>",
        to: process.env.NOTIFY_EMAIL ?? "bigboyvova01@gmail.com",
        subject,
        text,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("resend failed", err);
    return false;
  }
}

/** Fan a message out to every configured channel. */
export async function notifyOwner(subject: string, text: string): Promise<NotifyResult> {
  const [telegram, email] = await Promise.all([sendTelegram(text), sendEmail(subject, text)]);
  return { telegram, email };
}
