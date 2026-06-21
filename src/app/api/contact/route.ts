import { NextResponse } from "next/server";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Укажите имя").max(100),
  channel: z.enum(["email", "telegram"]),
  contact: z.string().min(2, "Укажите контакт для связи").max(200),
  message: z.string().min(5, "Сообщение слишком короткое").max(4000),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Ошибка валидации";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const { name, channel, contact, message } = parsed.data;

  const channelLabel = channel === "telegram" ? "Telegram" : "Email";
  const text = [
    "📨 Новое сообщение с портфолио",
    "",
    `👤 От: ${name}`,
    `📡 Способ связи: ${channelLabel} — ${contact}`,
    "",
    message,
  ].join("\n");

  // Дублируем тикет во все настроенные каналы — чтобы ничего не потерять.
  await Promise.allSettled([
    sendTelegram(text),
    sendEmail(name, channel, contact, text),
    sendWebhook(text),
  ]);

  return NextResponse.json({ ok: true });
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
}

async function sendEmail(name: string, channel: string, contact: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Portfolio <onboarding@resend.dev>",
      to: process.env.NOTIFY_EMAIL ?? "bigboyvova01@gmail.com",
      // если контакт — это email, удобно ответить прямо из почты
      ...(channel === "email" && contact.includes("@") ? { reply_to: contact } : {}),
      subject: `📨 Сообщение с портфолио — ${name}`,
      text,
    }),
  });
}

async function sendWebhook(text: string) {
  const webhook = process.env.CONTACT_WEBHOOK;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });
}
