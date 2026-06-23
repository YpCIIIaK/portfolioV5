import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { mailConfigured, fetchInbox, fetchMessage } from "@/lib/mail-server";

export const runtime = "nodejs";

/**
 * Owner-only inbox reader.
 *   GET ?limit=5    -> latest N summaries
 *   GET ?uid=123    -> one full message
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!mailConfigured()) return NextResponse.json({ error: "IMAP не настроен" }, { status: 503 });

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");

  try {
    if (uid) {
      const item = await fetchMessage(Number(uid));
      if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ item });
    }
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 5)));
    const items = await fetchInbox(limit);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "Не удалось получить почту: " + (e as Error).message }, { status: 502 });
  }
}
