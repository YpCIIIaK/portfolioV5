import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { supabaseConfigured } from "@/lib/supabase";
import { planSweep, sweepStep } from "@/lib/brain-sweep";

export const runtime = "nodejs";
// Пачка читается целиком и уходит в модель одним запросом — это долго.
export const maxDuration = 300;

/**
 * Полный обход Диска.
 *
 * GET — план: сколько файлов и во сколько итераций они уложатся (панель
 * показывает это ДО старта, чтобы обход на сорок итераций не начинался вслепую).
 * POST {cursor} — одна итерация; в ответе курсор для следующей.
 *
 * Цикл гоняет клиент, а не сервер: обход длиннее любого разумного лимита
 * серверной функции, и держать его одним запросом невозможно. Курсор — всё
 * состояние, так что прерванный обход продолжается с того же места.
 */

async function guard() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });
  return null;
}

export async function GET() {
  const bad = await guard();
  if (bad) return bad;
  try {
    return NextResponse.json(await planSweep());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const bad = await guard();
  if (bad) return bad;

  const body = (await req.json().catch(() => ({}))) as { cursor?: unknown; scope?: unknown };
  const cursor = typeof body.cursor === "number" && Number.isFinite(body.cursor) ? Math.max(0, Math.floor(body.cursor)) : 0;
  const scope = body.scope === "new" ? "new" : "all";

  try {
    return NextResponse.json(await sweepStep(cursor, scope));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
