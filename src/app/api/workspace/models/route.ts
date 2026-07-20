import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import {
  AI_TASKS,
  AI_TASK_HINT,
  AI_TASK_LABEL,
  envModel,
  fetchCatalog,
  getModelMap,
  isAiTask,
  setModel,
} from "@/lib/ai-models";

export const runtime = "nodejs";

/**
 * Настройка моделей OpenRouter по задачам. Всё owner-only: выбор модели — это
 * прямая трата денег на аккаунте, посторонним тут делать нечего.
 *
 * GET            — текущая карта задача→модель + подписи для UI.
 * GET ?catalog=1 — список моделей OpenRouter (кэш на час).
 * PUT            — { task, model }; пустая модель означает «брать общую».
 */

export async function GET(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (new URL(req.url).searchParams.get("catalog")) {
    try {
      return NextResponse.json({ models: await fetchCatalog() });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  const map = supabaseConfigured() ? await getModelMap() : {};
  return NextResponse.json({
    map,
    env: envModel(),
    tasks: AI_TASKS.map((t) => ({ id: t, label: AI_TASK_LABEL[t], hint: AI_TASK_HINT[t] })),
    storage: supabaseConfigured(),
  });
}

export async function PUT(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { task?: string; model?: string };
  if (!isAiTask(body.task)) {
    return NextResponse.json({ error: "неизвестная задача" }, { status: 400 });
  }

  // Идентификатор модели уходит в чужой API — пускаем только тот алфавит,
  // который OpenRouter реально использует, чтобы в тело запроса нельзя было
  // подсунуть ничего постороннего.
  const model = (body.model ?? "").trim();
  if (model && !/^[\w.\-]+\/[\w.\-:]+$/.test(model)) {
    return NextResponse.json({ error: "некорректный id модели" }, { status: 400 });
  }

  try {
    await setModel(body.task, model);
    return NextResponse.json({ ok: true, map: await getModelMap() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
