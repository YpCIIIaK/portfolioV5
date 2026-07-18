import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestRepoHealth } from "@/lib/tool-reports";

export const runtime = "nodejs";

/**
 * Ingest endpoint for repo-janitor (or any repo-health scanner). The scan runs
 * elsewhere (local CLI / GitHub Action); it POSTs the compact result here.
 *
 * Auth: a shared secret in the `x-tools-secret` header (TOOLS_INGEST_SECRET).
 * No owner session — this is machine-to-machine.
 */
const schema = z.object({
  repo: z.string().min(1).max(200),
  score: z.number().min(0).max(100),
  grade: z.string().max(2).default(""),
  scannedAt: z.string().max(40).optional(),
  summary: z
    .object({ critical: z.number().optional(), warning: z.number().optional(), info: z.number().optional() })
    .optional(),
  categories: z
    .array(z.object({ name: z.string().max(80), severity: z.string().max(20), count: z.number() }))
    .max(50)
    .optional(),
  url: z.string().url().max(500).nullish(),
});

export async function POST(req: Request) {
  const secret = process.env.TOOLS_INGEST_SECRET;
  if (!secret) return NextResponse.json({ error: "ingest не настроен (TOOLS_INGEST_SECRET)" }, { status: 503 });
  if (req.headers.get("x-tools-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body", detail: parsed.error.issues }, { status: 400 });

  try {
    await ingestRepoHealth({ ...parsed.data, url: parsed.data.url ?? null });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
