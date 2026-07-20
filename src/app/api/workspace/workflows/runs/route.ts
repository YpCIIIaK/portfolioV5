import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured, sbSelect } from "@/lib/supabase";
import type { WorkflowRun } from "@/lib/workflow-steps";

export const runtime = "nodejs";

/** История запусков воркфлоу: `?workflow_id=…` — по одному, без него — все. */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("workflow_id");
  const filter = id ? `&workflow_id=eq.${encodeURIComponent(id)}` : "";
  const items = await sbSelect<WorkflowRun>(
    "ws_workflow_runs",
    `select=*${filter}&order=created_at.desc&limit=30`,
  );
  return NextResponse.json({ items });
}
