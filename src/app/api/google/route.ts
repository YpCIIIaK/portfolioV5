import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { googleStatus, disconnectGoogle, listSources } from "@/lib/google";

export const runtime = "nodejs";

/** Owner-only: connection status + the folders currently feeding the index. */
export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = await googleStatus();
  const sources = status.connected ? await listSources().catch(() => []) : [];
  return NextResponse.json({ ...status, sources });
}

/** Disconnect: drops the tokens, the picked folders and the index. */
export async function DELETE() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await disconnectGoogle();
  return NextResponse.json({ ok: true });
}
