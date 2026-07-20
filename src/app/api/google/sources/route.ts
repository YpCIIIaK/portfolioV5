import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { listSources, addSource, removeSource } from "@/lib/google";

export const runtime = "nodejs";

const ItemSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().min(1).max(200),
  /** 'file' attaches exactly one file instead of walking a folder. */
  kind: z.enum(["folder", "file"]).default("folder"),
});

const AddSchema = z.object({
  /** Batch: the picker lets the owner accumulate a selection across folders. */
  items: z.array(ItemSchema).min(1).max(50),
  recursive: z.boolean().default(true),
});

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ sources: await listSources() });
}

/**
 * Attach folders/files. Registering is all this does — indexing is a separate
 * /api/google/sync call, so picking a 3k-file folder returns instantly instead
 * of holding the request open for minutes.
 */
export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = AddSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const added: unknown[] = [];
  const failed: { name: string; error: string }[] = [];

  // One bad item (already attached, say) shouldn't lose the rest of the batch.
  for (const item of parsed.data.items) {
    try {
      added.push(await addSource(item.folderId, item.name, parsed.data.recursive, item.kind));
    } catch (e) {
      failed.push({ name: item.name, error: (e as Error).message });
    }
  }

  if (!added.length && failed.length) {
    return NextResponse.json({ error: failed.map((f) => `${f.name}: ${f.error}`).join("; ") }, { status: 400 });
  }
  return NextResponse.json({ added: added.length, failed });
}

/** Detach a folder: removes it and its index rows. The files on Drive stay. */
export async function DELETE(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await removeSource(id);
  return NextResponse.json({ ok: true });
}
