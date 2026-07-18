import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { notionOAuthConfigured, notionAuthorizeUrl } from "@/lib/notion";

export const runtime = "nodejs";

export const NOTION_STATE_COOKIE = "ws_notion_state";

/** Owner-only: kick off the Notion OAuth flow. */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!notionOAuthConfigured()) {
    return NextResponse.json({ error: "Notion OAuth не настроен (NOTION_CLIENT_ID/SECRET, Supabase)" }, { status: 503 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/notion/callback`;
  const state = crypto.randomUUID();

  (await cookies()).set(NOTION_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  return NextResponse.redirect(notionAuthorizeUrl(redirectUri, state));
}
