import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { supabaseConfigured } from "@/lib/supabase";
import { notifyOwner } from "@/lib/notify";
import { augmentLatestBrain } from "@/lib/brain";

export const runtime = "nodejs";
// Холодный сбор контекста + генерация — как у полного билда мозга.
export const maxDuration = 300;

/**
 * «Утренний тик» мозга: инкрементальное дополнение последнего снапшота.
 * Модель получает ШОРТКАТЫ существующих узлов (id | label | категория — без
 * полных summary) и свежий контекст, возвращает только новые узлы и связи;
 * дельта мержится в последний снапшот ws_brain. Идемпотентно: дубликаты по
 * названию отбрасываются, так что запускать можно сколько угодно.
 *
 * Auth как у /api/workspace/cron: x-cron-secret / ?secret= для планировщика
 * (pg_cron, см. docs/workspace-schema.sql) или owner-сессия для ручного запуска.
 */

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (provided && provided === secret) return true;
  }
  return !!(await requireOwner());
}

async function run(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });
  }

  try {
    const r = await augmentLatestBrain();
    if (r.skipped) return NextResponse.json({ ok: true, skipped: r.skipped });

    if (r.added) {
      await notifyOwner(
        `🧠 Мозг дополнен: +${r.added}`,
        [`🧠 «${r.title}» дополнен: +${r.added} узл., +${r.edges} связ.`, "", ...r.labels.map((l) => `• ${l}`)].join("\n"),
      ).catch(() => { /* уведомление — не повод ронять тик */ });
    }

    return NextResponse.json({ ok: true, id: r.id, added: r.added, edges: r.edges, labels: r.labels, data: r.data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}
