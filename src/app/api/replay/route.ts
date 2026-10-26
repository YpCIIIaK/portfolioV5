import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { sbDelete, sbSelect, sbUpsert, supabaseConfigured } from "@/lib/supabase";
import { decodeRef } from "@/lib/refcode";
import { REPLAY_LIMITS, type ReplayEvent, type ReplayMeta } from "@/lib/replay";

export const runtime = "nodejs";

/**
 * Session replay storage (see docs/workspace-schema.sql → ws_replays / ws_replay_chunks).
 *
 * POST — public: the recorder uploads a chunk of events. Size-capped and
 *        shape-checked; geo comes from Vercel headers, never from the client.
 * GET  — owner: list of sessions, or ?id= for one session with all its events.
 * DELETE ?id= — owner: drop a session.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["m", "c", "s", "f", "w", "v", "i", "d"]);
const MAX_BODY = 400_000;

interface ReplayRow {
  id: string;
  started_at: string;
  updated_at: string;
  duration_ms: number;
  chunks: number;
  events_count: number;
  meta: (ReplayMeta & { geo?: string; ip?: string }) | null;
}

function geoOf(req: Request) {
  const h = req.headers;
  const dec = (v: string | null) => (v ? decodeURIComponent(v) : "");
  return {
    geo: [dec(h.get("x-vercel-ip-city")), dec(h.get("x-vercel-ip-country"))].filter(Boolean).join(", "),
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim(),
  };
}

export async function POST(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ ok: false, reason: "storage not configured" });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too large" }, { status: 413 });

  let body: { id?: string; seq?: number; events?: ReplayEvent[]; meta?: ReplayMeta };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { id, seq, events, meta } = body;
  if (!id || !UUID.test(id) || !Number.isInteger(seq) || seq! < 0 || seq! >= REPLAY_LIMITS.maxChunks) {
    return NextResponse.json({ error: "bad id/seq" }, { status: 400 });
  }
  if (!Array.isArray(events) || events.length === 0 || events.length > REPLAY_LIMITS.maxEventsPerChunk) {
    return NextResponse.json({ error: "bad events" }, { status: 400 });
  }
  const clean = events.filter((e) => e && typeof e.t === "number" && KINDS.has(e.k));
  if (!clean.length) return NextResponse.json({ error: "bad events" }, { status: 400 });

  try {
    const existing = (await sbSelect<ReplayRow>("ws_replays", `id=eq.${id}&select=chunks,events_count,duration_ms,meta`))[0];
    const row: Record<string, unknown> = {
      id,
      updated_at: new Date().toISOString(),
      duration_ms: Math.max(existing?.duration_ms ?? 0, ...clean.map((e) => e.t)),
      chunks: (existing?.chunks ?? 0) + 1,
      events_count: (existing?.events_count ?? 0) + clean.length,
    };
    if (meta && !existing?.meta) {
      const ref = meta.ref ? decodeRef(meta.ref) ?? meta.ref : undefined;
      row.meta = { ...meta, ref, ...geoOf(req) };
    }
    // Parent row first: chunks reference it.
    await sbUpsert("ws_replays", row, "id");
    await sbUpsert("ws_replay_chunks", { session_id: id, seq, events: clean }, "session_id,seq");
  } catch (e) {
    console.error("replay store failed", e);
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ sessions: [] });

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    if (!UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
    const [session] = await sbSelect<ReplayRow>("ws_replays", `id=eq.${id}`);
    const chunks = await sbSelect<{ seq: number; events: ReplayEvent[] }>(
      "ws_replay_chunks",
      `session_id=eq.${id}&select=seq,events&order=seq.asc`,
    );
    return NextResponse.json({ session: session ?? null, events: chunks.flatMap((c) => c.events) });
  }
  const sessions = await sbSelect<ReplayRow>("ws_replays", "order=started_at.desc&limit=150");
  return NextResponse.json({ sessions });
}

export async function DELETE(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  await sbDelete("ws_replay_chunks", `session_id=eq.${id}`);
  await sbDelete("ws_replays", `id=eq.${id}`);
  return NextResponse.json({ ok: true });
}
