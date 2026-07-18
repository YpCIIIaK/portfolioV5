import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import {
  notionStatus,
  searchNotion,
  pageContent,
  listDatabases,
  fetchNotionTasks,
  createPage,
  updateNotionConfig,
  disconnectNotion,
} from "@/lib/notion";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Owner-only Notion reader/writer (via stored OAuth token).
 *   GET  ?scope=status                 -> connection state + config
 *   GET  ?scope=search&q=...           -> pages & databases
 *   GET  ?scope=page&id=...            -> one page rendered to markdown
 *   GET  ?scope=databases             -> list of databases (for task-source pick)
 *   GET  ?scope=tasks                 -> tasks from the configured database
 *   POST { action: "create", ... }    -> create a page/row
 *   POST { action: "config", ... }    -> set which DB backs tasks, etc.
 *   POST { action: "disconnect" }     -> forget the token
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "status";

  try {
    if (scope === "status") return NextResponse.json(await notionStatus());
    if (scope === "search") {
      return NextResponse.json({ items: await searchNotion(url.searchParams.get("q") || "") });
    }
    if (scope === "page") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
      return NextResponse.json({ item: await pageContent(id) });
    }
    if (scope === "databases") return NextResponse.json({ items: await listDatabases() });
    if (scope === "tasks") {
      const status = await notionStatus();
      return NextResponse.json({ items: await fetchNotionTasks(status.config) });
    }
    return NextResponse.json({ error: "unknown scope" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Notion: " + (e as Error).message }, { status: 502 });
  }
}

const createSchema = z.object({
  action: z.literal("create"),
  title: z.string().min(1).max(2000),
  markdown: z.string().max(20000).optional(),
  parentPageId: z.string().optional(),
  parentDbId: z.string().optional(),
});
const configSchema = z.object({
  action: z.literal("config"),
  tasksDbId: z.string().optional(),
  donePropName: z.string().optional(),
  duePropName: z.string().optional(),
  priorityPropName: z.string().optional(),
});
const disconnectSchema = z.object({ action: z.literal("disconnect") });
const bodySchema = z.union([createSchema, configSchema, disconnectSchema]);

export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const body = parsed.data;
    if (body.action === "disconnect") {
      await disconnectNotion();
      return NextResponse.json({ ok: true });
    }
    if (body.action === "config") {
      const { action: _a, ...patch } = body;
      void _a;
      return NextResponse.json({ config: await updateNotionConfig(patch) });
    }
    // create
    const item = await createPage({
      title: body.title,
      markdown: body.markdown,
      parentPageId: body.parentPageId,
      parentDbId: body.parentDbId,
    });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: "Notion: " + (e as Error).message }, { status: 502 });
  }
}
