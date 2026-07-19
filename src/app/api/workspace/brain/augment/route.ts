import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, askAI } from "@/lib/ai";
import { supabaseConfigured, sbSelect, sbUpdate } from "@/lib/supabase";
import { notifyOwner } from "@/lib/notify";
import { buildBrainShortcuts, buildBrainAugmentPrompt, parseBrainAnswer, mergeBrainDelta, collectBrainContext, type BrainData } from "@/lib/brain";

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

interface BrainRow { id: string; title: string; data: BrainData; updated_at: string }

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

  const rows = await sbSelect<BrainRow>("ws_brain", "select=*&order=updated_at.desc&limit=1");
  const snapshot = rows[0];
  if (!snapshot || !snapshot.data.nodes.length) {
    return NextResponse.json({ ok: true, skipped: "нет снапшота — сначала собери мозг полностью" });
  }

  try {
    const { context } = await collectBrainContext();
    const prompt = buildBrainAugmentPrompt(buildBrainShortcuts(snapshot.data), context);
    const answer = await askAI(prompt, { temperature: 0.3, maxTokens: 3000 });
    const knownIds = new Set(snapshot.data.nodes.map((n) => n.id));
    const delta = parseBrainAnswer(answer, knownIds);

    const { data, addedNodes, addedEdges, labels } = mergeBrainDelta(snapshot.data, delta);
    if (!addedNodes && !addedEdges) {
      return NextResponse.json({ ok: true, id: snapshot.id, added: 0, edges: 0 });
    }

    await sbUpdate("ws_brain", `id=eq.${encodeURIComponent(snapshot.id)}`, {
      data,
      updated_at: new Date().toISOString(),
    });

    if (addedNodes) {
      await notifyOwner(
        `🧠 Мозг дополнен: +${addedNodes}`,
        [`🧠 «${snapshot.title}» дополнен: +${addedNodes} узл., +${addedEdges} связ.`, "", ...labels.map((l) => `• ${l}`)].join("\n"),
      ).catch(() => { /* уведомление — не повод ронять тик */ });
    }

    return NextResponse.json({ ok: true, id: snapshot.id, added: addedNodes, edges: addedEdges, labels, data });
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
