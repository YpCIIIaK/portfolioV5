import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { syncAll } from "@/lib/google";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Re-index every attached folder. After the first run this replays Drive's
 * changes feed, so a quiet day costs one API call per source.
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
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });

  try {
    return NextResponse.json({ ok: true, results: await syncAll() });
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
