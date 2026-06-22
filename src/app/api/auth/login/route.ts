import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

/** Kick off the GitHub OAuth flow. */
export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth не настроен (нет GITHUB_CLIENT_ID)." },
      { status: 500 },
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/callback`;
  const state = crypto.randomUUID();

  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize.toString());
}
