import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listChildren, FOLDER_MIME } from "@/lib/google";

export const runtime = "nodejs";

/**
 * Owner-only: one level of the Drive tree for the picker — folders and files
 * both, so either can be attached. `?parent=<id>` drills in; without it, the
 * account's root.
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parent = new URL(req.url).searchParams.get("parent") ?? undefined;
  try {
    const items = await listChildren(parent);
    return NextResponse.json({
      folders: items.filter((i) => i.mimeType === FOLDER_MIME),
      files: items.filter((i) => i.mimeType !== FOLDER_MIME),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
