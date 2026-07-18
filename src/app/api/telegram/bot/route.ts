import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { runAssistant, buildAssistantSystem } from "@/lib/assistant-agent";
import { collectContext, todayISO } from "@/lib/aggregate";
import { sendTelegram } from "@/lib/notify";

export const runtime = "nodejs";
// The agent may take a few tool-calling round-trips; give it room.
export const maxDuration = 60;

/**
 * Inbound Telegram bot webhook — the assistant as a chat you can message from
 * your phone. Reuses the SAME agent core as the workspace chat.
 *
 * Security: Telegram signs each request with the secret set at setWebhook time
 * (`X-Telegram-Bot-Api-Secret-Token`), and we only answer the owner's own chat
 * (TELEGRAM_CHAT_ID). Anything else is silently acknowledged and dropped.
 *
 * Register once with scripts/telegram-set-webhook.mjs.
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
  if (!aiConfigured()) {
    await sendTelegram("AI не настроен (OPENROUTER_API_KEY).");
    return NextResponse.json({ ok: true });
  }

  try {
    const context = await collectContext();
    const system = buildAssistantSystem(todayISO(), context);
    const { answer } = await runAssistant(system, [{ role: "user", content: text.slice(0, 4000) }]);
    await sendTelegram(answer.slice(0, 4000));
  } catch (e) {
    await sendTelegram(`Ошибка: ${(e as Error).message}`);
  }
  return NextResponse.json({ ok: true });
}
