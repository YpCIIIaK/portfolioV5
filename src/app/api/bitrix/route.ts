import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { bitrixConfigured, fetchTasks, fetchChats, fetchMessages, fetchFeed } from "@/lib/bitrix";

export const runtime = "nodejs";

/**
 * Owner-only Bitrix24 reader (via incoming webhook).
 *   GET ?scope=tasks               -> my open tasks
 *   GET ?scope=chats               -> recent dialogs
 *   GET ?scope=messages&dialog=ID  -> messages of one dialog
 *   GET ?scope=feed                -> activity feed posts
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!bitrixConfigured()) return NextResponse.json({ error: "Bitrix не настроен (BITRIX_WEBHOOK_URL)" }, { status: 503 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "tasks";

  try {
    if (scope === "tasks") return NextResponse.json({ items: await fetchTasks() });
    if (scope === "chats") return NextResponse.json({ items: await fetchChats() });
    if (scope === "feed") return NextResponse.json({ items: await fetchFeed() });
    if (scope === "messages") {
      const dialog = url.searchParams.get("dialog");
      if (!dialog) return NextResponse.json({ error: "missing dialog" }, { status: 400 });
      return NextResponse.json({ items: await fetchMessages(dialog) });
    }
    return NextResponse.json({ error: "unknown scope" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Bitrix: " + (e as Error).message }, { status: 502 });
  }
}
