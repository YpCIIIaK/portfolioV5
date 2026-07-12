import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { telegramConfigured, downloadMedia } from "@/lib/telegram";

export const runtime = "nodejs";
// Downloading a video can take a while; give it headroom.
export const maxDuration = 60;

/**
 * Owner-only media proxy: streams the attachment of one Telegram message.
 *   GET ?peer=ID&id=MSG_ID  -> raw bytes with the right Content-Type
 * Used by <img>/<video>/<audio> in the Telegram panel.
 */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!telegramConfigured()) return NextResponse.json({ error: "Telegram не настроен" }, { status: 503 });

  const url = new URL(req.url);
  const peer = url.searchParams.get("peer");
  const id = Number(url.searchParams.get("id"));
  if (!peer || !id) return NextResponse.json({ error: "missing peer/id" }, { status: 400 });

  try {
    const media = await downloadMedia(peer, id);
    if (!media) return NextResponse.json({ error: "no media" }, { status: 404 });
    return new Response(media.data as BodyInit, {
      headers: {
        "Content-Type": media.mime,
        // Private (owner-only) but cacheable in the browser so re-scrolling a
        // chat doesn't re-download the same photo.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Telegram: " + (e as Error).message }, { status: 502 });
  }
}
