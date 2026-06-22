import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured, sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Owner-only CRUD for the personal workspace, one handler for every collection.
 * Guests never reach here (the UI shows local demo data instead); every method
 * is gated behind requireOwner().
 */

type Kind = "notes" | "tasks" | "events";

const TABLE: Record<Kind, string> = {
  notes: "ws_notes",
  tasks: "ws_tasks",
  events: "ws_events",
};

const ORDER: Record<Kind, string> = {
  notes: "order=updated_at.desc",
  tasks: "order=created_at.desc",
  events: "order=date.asc",
};

// Field whitelists — anything else in the body is dropped before hitting the DB.
const CREATE: Record<Kind, z.ZodTypeAny> = {
  notes: z.object({ title: z.string().max(200).default("Без названия"), body: z.string().max(20000).default("") }),
  tasks: z.object({ title: z.string().min(1).max(500), done: z.boolean().default(false), due: z.string().nullable().default(null) }),
  events: z.object({ title: z.string().min(1).max(300), date: z.string(), time: z.string().nullable().default(null), note: z.string().max(2000).nullable().default(null) }),
};

const UPDATE: Record<Kind, z.ZodTypeAny> = {
  notes: z.object({ title: z.string().max(200).optional(), body: z.string().max(20000).optional() }),
  tasks: z.object({ title: z.string().min(1).max(500).optional(), done: z.boolean().optional(), due: z.string().nullable().optional() }),
  events: z.object({ title: z.string().min(1).max(300).optional(), date: z.string().optional(), time: z.string().nullable().optional(), note: z.string().max(2000).nullable().optional() }),
};

function parseKind(raw: string): Kind | null {
  return raw === "notes" || raw === "tasks" || raw === "events" ? raw : null;
}

async function guard(kindRaw: string): Promise<{ kind: Kind } | NextResponse> {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }
  const kind = parseKind(kindRaw);
  if (!kind) return NextResponse.json({ error: "unknown collection" }, { status: 404 });
  return { kind };
}

type Ctx = { params: Promise<{ kind: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await guard((await params).kind);
  if (g instanceof NextResponse) return g;
  const rows = await sbSelect(TABLE[g.kind], `select=*&${ORDER[g.kind]}`);
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request, { params }: Ctx) {
  const g = await guard((await params).kind);
  if (g instanceof NextResponse) return g;
  const parsed = CREATE[g.kind].safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const row = await sbInsert(TABLE[g.kind], parsed.data as Record<string, unknown>);
  return NextResponse.json({ item: row }, { status: 201 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await guard((await params).kind);
  if (g instanceof NextResponse) return g;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const parsed = UPDATE[g.kind].safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const patch = { ...(parsed.data as Record<string, unknown>) };
  if (g.kind === "notes") patch.updated_at = new Date().toISOString();
  const row = await sbUpdate(TABLE[g.kind], `id=eq.${encodeURIComponent(id)}`, patch);
  return NextResponse.json({ item: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await guard((await params).kind);
  if (g instanceof NextResponse) return g;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await sbDelete(TABLE[g.kind], `id=eq.${encodeURIComponent(id)}`);
  return NextResponse.json({ ok: true });
}
