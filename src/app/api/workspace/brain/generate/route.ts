import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, askAI } from "@/lib/ai";
import { buildBrainPrompt, buildEdgesPrompt, buildBrainShortcuts, parseBrainAnswer, mergeBrainDelta, collectBrainContext } from "@/lib/brain";

export const runtime = "nodejs";
// Холодная функция собирает контекст с нуля (IMAP + Telegram + Notion — десятки
// секунд) и только потом зовёт модель. 60с не хватает — берём максимум Fluid.
export const maxDuration = 300;

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
    const { context, sources } = await collectBrainContext();
    const answer = await askAI(buildBrainPrompt(context), { temperature: 0.4, maxTokens: 6000 });
    let data = parseBrainAnswer(answer);
    if (!data.nodes.length) throw new Error("модель вернула пустой граф");

    // Модель поскупилась на связи — досвязываем отдельным коротким запросом.
    if (data.nodes.length >= 4 && data.edges.length < data.nodes.length / 2) {
      try {
        const extra = await askAI(buildEdgesPrompt(buildBrainShortcuts(data)), { temperature: 0.3, maxTokens: 2000 });
        const delta = parseBrainAnswer(extra, new Set(data.nodes.map((n) => n.id)));
        data = mergeBrainDelta(data, { nodes: [], edges: delta.edges }).data;
      } catch { /* граф без части связей лучше, чем ошибка */ }
    }

    return NextResponse.json({ data, sources });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
