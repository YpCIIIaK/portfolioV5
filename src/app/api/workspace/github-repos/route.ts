import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { githubConfigured, listReposForImport } from "@/lib/github";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Owner-only: the owner's GitHub repositories (incl. private) for the
 * "import as project" picker in the Projects panel. Uses GITHUB_PAT.
 */
export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!githubConfigured()) {
    return NextResponse.json({ error: "GitHub не настроен (нет GITHUB_PAT)." }, { status: 503 });
  }
  try {
    const repos = await listReposForImport();
    return NextResponse.json({ repos });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
