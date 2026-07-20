import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listFolders } from "@/lib/google";

export const runtime = "nodejs";

/**
 * Owner-only: folders available to pick. `?parent=<id>` lists one level down,
 * so the UI can drill into the tree; without it, every folder the account sees.
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parent = new URL(req.url).searchParams.get("parent") ?? undefined;
  try {
    return NextResponse.json({ folders: await listFolders(parent) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
