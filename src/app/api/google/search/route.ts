import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { searchDrive } from "@/lib/google";

export const runtime = "nodejs";

/** Owner-only: search the local index (name + excerpt). Never hits Drive. */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  // Лимит с клиента: список файлов показывает заметно больше, чем берёт
  // ассистент в контекст, иначе свежедобавленная папка «пропадает» за верхушкой.
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 500);
  try {
    return NextResponse.json({ files: await searchDrive(q, limit) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
