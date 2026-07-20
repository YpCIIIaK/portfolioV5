import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { listSources, addSource, removeSource, syncSource } from "@/lib/google";

export const runtime = "nodejs";
// A cold first walk of a big folder downloads excerpts file by file.
export const maxDuration = 300;

const AddSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().min(1).max(200),
  recursive: z.boolean().default(true),
  /** 'file' attaches exactly one file instead of walking a folder. */
  kind: z.enum(["folder", "file"]).default("folder"),
});

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ sources: await listSources() });
}

/** Attach a folder and index it right away, so it's usable without a second click. */
export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = AddSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    const source = await addSource(
      parsed.data.folderId,
      parsed.data.name,
      parsed.data.recursive,
      parsed.data.kind,
    );
    const stats = await syncSource(source);
    return NextResponse.json({ source, stats });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Detach a folder: removes it and its index rows. The files on Drive stay. */
export async function DELETE(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await removeSource(id);
  return NextResponse.json({ ok: true });
}
