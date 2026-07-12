import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { telegramConfigured, fetchDialogs, fetchMessages, sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";
// MTProto connect + work can take a few seconds; give it room.
export const maxDuration = 30;

/**
 * Owner-only Telegram reader/sender (personal account via GramJS).
 *   GET  ?scope=dialogs              -> recent chats
 *   GET  ?scope=messages&peer=ID     -> messages of one dialog
 *   POST { peer, text }              -> send a message to a dialog
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram не настроен (TELEGRAM_API_ID/API_HASH/SESSION)" }, { status: 503 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "dialogs";

  try {
    if (scope === "dialogs") return NextResponse.json({ items: await fetchDialogs() });
    if (scope === "messages") {
      const peer = url.searchParams.get("peer");
      if (!peer) return NextResponse.json({ error: "missing peer" }, { status: 400 });
      const before = Number(url.searchParams.get("before")) || 0;
      return NextResponse.json({ items: await fetchMessages(peer, 40, before) });
    }
    return NextResponse.json({ error: "unknown scope" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Telegram: " + (e as Error).message }, { status: 502 });
  }
}

const sendSchema = z.object({ peer: z.string().min(1), text: z.string().min(1).max(4096) });

export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram не настроен" }, { status: 503 });
  }

  const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const res = await sendMessage(parsed.data.peer, parsed.data.text);
    return NextResponse.json({ ok: true, id: res.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Telegram: " + (e as Error).message }, { status: 502 });
  }
}
