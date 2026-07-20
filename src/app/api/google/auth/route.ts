import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { googleConfigured, googleAuthorizeUrl } from "@/lib/google";

export const runtime = "nodejs";

export const GOOGLE_STATE_COOKIE = "ws_google_state";

/** Owner-only: kick off the Google Drive OAuth flow. */
export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google OAuth не настроен (GOOGLE_CLIENT_ID/SECRET, Supabase)" }, { status: 503 });
  }

  const origin = new URL(req.url).origin;
  const state = crypto.randomUUID();

  (await cookies()).set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  return NextResponse.redirect(googleAuthorizeUrl(`${origin}/api/google/callback`, state));
}
