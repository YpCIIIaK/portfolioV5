import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { generateBrainData } from "@/lib/brain";

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
    const { data, sources } = await generateBrainData();
    return NextResponse.json({ data, sources });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
