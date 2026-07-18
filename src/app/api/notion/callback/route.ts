import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { exchangeCode, saveIntegration } from "@/lib/notion";
import { NOTION_STATE_COOKIE } from "../auth/route";

export const runtime = "nodejs";

/** Notion redirects back here with ?code & ?state. Exchange & persist the token. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const home = url.origin + "/?file=workspace%2Fnotion.tsx";

  const jar = await cookies();
  const expectedState = jar.get(NOTION_STATE_COOKIE)?.value;
  jar.delete(NOTION_STATE_COOKIE);

  // Only the owner may bind a Notion workspace to this server.
  if (!(await requireOwner())) return NextResponse.redirect(home + "&notion=forbidden");
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(home + "&notion=error");
  }

  try {
    const token = await exchangeCode(code, `${url.origin}/api/notion/callback`);
    await saveIntegration(token);
    return NextResponse.redirect(home + "&notion=connected");
  } catch {
    return NextResponse.redirect(home + "&notion=error");
  }
}
