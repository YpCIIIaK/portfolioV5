import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  makeSession,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

/** GitHub redirects back here with ?code & ?state. Exchange, verify, set session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const home = url.origin + "/";

  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(home + "?auth=error");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(home + "?auth=error");
  }

  try {
    // 1) code -> access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${url.origin}/api/auth/callback`,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return NextResponse.redirect(home + "?auth=error");

    // 2) token -> user
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "portfolio-workspace",
      },
    });
    const user = (await userRes.json()) as {
      id: number;
      login: string;
      name?: string | null;
      avatar_url?: string;
    };
    if (!user?.id) return NextResponse.redirect(home + "?auth=error");

    // 3) sign & set session (owner flag derived from OWNER_GITHUB_ID)
    const session = makeSession(user);
    const token = await signSession(session);
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());

    return NextResponse.redirect(home + (session.owner ? "?auth=owner" : "?auth=guest"));
  } catch {
    return NextResponse.redirect(home + "?auth=error");
  }
}
