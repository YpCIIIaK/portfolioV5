import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner, getSession } from "@/lib/auth";
import { supabaseConfigured, sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Owner-only CRUD for the personal workspace, one handler for every collection.
 * Guests never reach here (the UI shows local demo data instead); every method
 * is gated behind requireOwner().
 */

type Kind = "notes" | "tasks" | "events" | "projects" | "subscriptions";

const TABLE: Record<Kind, string> = {
  notes: "ws_notes",
  tasks: "ws_tasks",
  events: "ws_events",
  projects: "ws_projects",
  subscriptions: "ws_subscriptions",
};

const ORDER: Record<Kind, string> = {
  notes: "order=updated_at.desc",
  tasks: "order=created_at.desc",
  events: "order=date.asc",
  projects: "order=created_at.desc",
  subscriptions: "order=created_at.desc",
};

const priority = z.enum(["none", "low", "medium", "high"]);
const color = z.string().max(20);
const taskStatus = z.enum(["todo", "doing", "done"]);
const subPeriod = z.enum(["monthly", "yearly"]);

// Field whitelists — anything else in the body is dropped before hitting the DB.
const CREATE: Record<Kind, z.ZodTypeAny> = {
  notes: z.object({ title: z.string().max(200).default("Без названия"), body: z.string().max(20000).default(""), priority: priority.default("none"), color: color.default("") }),
  tasks: z.object({ title: z.string().min(1).max(500), done: z.boolean().default(false), status: taskStatus.default("todo"), due: z.string().nullable().default(null), priority: priority.default("none"), color: color.default("") }),
  events: z.object({ title: z.string().min(1).max(300), date: z.string(), time: z.string().nullable().default(null), note: z.string().max(2000).nullable().default(null), priority: priority.default("none"), color: color.default("") }),
  projects: z.object({ title: z.string().min(1).max(200), description: z.string().max(4000).default(""), repo_url: z.string().max(500).nullable().default(null), tags: z.string().max(500).default(""), is_public: z.boolean().default(true) }),
  subscriptions: z.object({ name: z.string().min(1).max(200), price: z.number().min(0).max(1e9).default(0), currency: z.string().max(8).default("₽"), period: subPeriod.default("monthly"), tier: z.string().max(100).default(""), description: z.string().max(2000).default(""), next_date: z.string().nullable().default(null) }),
};

const UPDATE: Record<Kind, z.ZodTypeAny> = {
  notes: z.object({ title: z.string().max(200).optional(), body: z.string().max(20000).optional(), priority: priority.optional(), color: color.optional() }),
  tasks: z.object({ title: z.string().min(1).max(500).optional(), done: z.boolean().optional(), status: taskStatus.optional(), due: z.string().nullable().optional(), priority: priority.optional(), color: color.optional() }),
  events: z.object({ title: z.string().min(1).max(300).optional(), date: z.string().optional(), time: z.string().nullable().optional(), note: z.string().max(2000).nullable().optional(), priority: priority.optional(), color: color.optional() }),
  projects: z.object({ title: z.string().min(1).max(200).optional(), description: z.string().max(4000).optional(), repo_url: z.string().max(500).nullable().optional(), tags: z.string().max(500).optional(), is_public: z.boolean().optional() }),
  subscriptions: z.object({ name: z.string().min(1).max(200).optional(), price: z.number().min(0).max(1e9).optional(), currency: z.string().max(8).optional(), period: subPeriod.optional(), tier: z.string().max(100).optional(), description: z.string().max(2000).optional(), next_date: z.string().nullable().optional() }),
};

function parseKind(raw: string): Kind | null {
  return raw === "notes" || raw === "tasks" || raw === "events" || raw === "projects" || raw === "subscriptions" ? raw : null;
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
  const kindRaw = (await params).kind;

  // Projects have public visibility: guests may read, but only is_public rows.
  if (kindRaw === "projects") {
    if (!supabaseConfigured()) {
      return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
    }
    const owner = !!(await getSession())?.owner;
    const filter = owner ? "" : "&is_public=eq.true";
    const rows = await sbSelect(TABLE.projects, `select=*${filter}&${ORDER.projects}`);
    return NextResponse.json({ items: rows });
  }

  const g = await guard(kindRaw);
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
  // Keep the kanban status and the legacy done flag consistent whichever one arrives.
  if (g.kind === "tasks") {
    if ("status" in patch && !("done" in patch)) patch.done = patch.status === "done";
    if ("done" in patch && !("status" in patch)) patch.status = patch.done ? "done" : "todo";
  }
  // Rescheduling an event re-arms its reminder.
  if (g.kind === "events" && ("date" in patch || "time" in patch)) patch.notified_at = null;
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
