import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { telegramConfigured, sendFiles, type UploadFile } from "@/lib/telegram";

export const runtime = "nodejs";
// Uploading a video/large file can take a while.
export const maxDuration = 60;

/**
 * Owner-only file sender. Multipart form:
 *   peer    — dialog id
 *   caption — optional text
 *   files   — one or more files (album when >1)
 */
export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!telegramConfigured()) return NextResponse.json({ error: "Telegram не настроен" }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }

  const peer = form.get("peer");
  const caption = (form.get("caption") as string) || "";
  const raw = form.getAll("files").filter((f): f is File => f instanceof File);

  if (typeof peer !== "string" || !peer) return NextResponse.json({ error: "missing peer" }, { status: 400 });
  if (raw.length === 0) return NextResponse.json({ error: "no files" }, { status: 400 });

  try {
    const files: UploadFile[] = await Promise.all(
      raw.map(async (f) => ({ name: f.name || "file", data: new Uint8Array(await f.arrayBuffer()) })),
    );
    const res = await sendFiles(peer, files, caption);
    return NextResponse.json({ ok: true, id: res.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Telegram: " + (e as Error).message }, { status: 502 });
  }
}
