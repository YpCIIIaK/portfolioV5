import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { invalidateContext } from "@/lib/aggregate";
import { supabaseConfigured } from "@/lib/supabase";
import { runSavedWorkflow } from "@/lib/workflow";

export const runtime = "nodejs";
// Цепочка может содержать несколько ИИ-шагов и чтений страниц — запас по времени.
export const maxDuration = 300;

/**
 * Запуск сохранённого воркфлоу. Только владелец: блоки шлют сообщения от его
 * имени и пишут в его кабинет. Запуск целиком логируется в ws_workflow_runs
 * (см. runSavedWorkflow), поэтому здесь только валидация и ответ.
 */

const body = z.object({
  id: z.string().min(1).max(64),
  input: z.string().max(10000).default(""),
});

export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const result = await runSavedWorkflow(parsed.data.id, parsed.data.input);
    // Блоки могли создать задачи/заметки/события — сводка ассистента устарела.
    invalidateContext();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
