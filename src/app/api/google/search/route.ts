import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { searchDrive } from "@/lib/google";

export const runtime = "nodejs";

/** Owner-only: search the local index (name + excerpt). Never hits Drive. */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ files: await searchDrive(q) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
