import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, askAI } from "@/lib/ai";
import { collectContext } from "@/lib/aggregate";
import { buildBrainPrompt, parseBrainAnswer } from "@/lib/brain";

export const runtime = "nodejs";
// Свежий сбор контекста + большая генерация — даём модели время.
export const maxDuration = 60;

/**
 * «Собрать мозг»: ИИ читает весь агрегированный контекст воркспейса и
 * возвращает граф знаний { nodes, edges }. Ничего не сохраняет — клиент сам
 * решает, сохранять ли результат как снапшот в ws_brain.
 */
export async function POST() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });
  }
  try {
    // Без force: кэшированный контекст (5 мин). Полный пересбор всех источников
    // (IMAP, Telegram, Notion) плюс долгая генерация не влезают в лимит функции.
    const context = await collectContext();
    const answer = await askAI(buildBrainPrompt(context), { temperature: 0.4, maxTokens: 3000 });
    const data = parseBrainAnswer(answer);
    if (!data.nodes.length) throw new Error("модель вернула пустой граф");
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
