import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listRepoHealth } from "@/lib/tool-reports";

export const runtime = "nodejs";

/** Owner-only: latest repo-health report per repo, with a short trend. */
export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ items: await listRepoHealth() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
