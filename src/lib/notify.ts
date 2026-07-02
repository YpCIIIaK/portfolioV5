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

/** Send a plain-text message to the owner's Telegram. Returns success. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    return res.ok;
  } catch (err) {
    console.error("telegram failed", err);
    return false;
  }
}

/** Send an email to the owner via Resend. Returns success. */
export async function sendEmail(subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Portfolio <onboarding@resend.dev>",
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
