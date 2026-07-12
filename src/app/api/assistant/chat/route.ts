import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, chatAI, type AiMessage } from "@/lib/ai";
import { collectContext, todayISO } from "@/lib/aggregate";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Owner-only assistant chat: answers questions grounded in the aggregated
 * snapshot (tasks, calendar, Bitrix, Telegram, mail). The context is injected
 * as a system message; the client sends the running conversation.
 */

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(20),
});

export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const context = await collectContext();
    const system = `Ты — личный ассистент владельца рабочего кабинета. Сегодня ${todayISO()}.
Тебе доступна актуальная сводка из его задач, календаря, Bitrix, Telegram, почты и свежих новостей (GitHub-тренды, тех и AI) — ниже.
Отвечай на её основе: кратко, по делу, на русском. Если в данных нет ответа — честно скажи, не выдумывай.
Можешь связывать источники (например, письмо и задачу от того же человека) и подсказывать приоритеты.

=== АКТУАЛЬНЫЕ ДАННЫЕ ===
${context || "(пока пусто — источники не подключены или нет свежих данных)"}
=== КОНЕЦ ДАННЫХ ===`;

    const messages: AiMessage[] = [{ role: "system", content: system }, ...parsed.data.messages];
    const answer = await chatAI(messages, { maxTokens: 700 });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
