import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/google";
import { GOOGLE_STATE_COOKIE } from "../auth/route";

export const runtime = "nodejs";

/** Google redirects back here with ?code & ?state. Exchange & persist the tokens. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const home = url.origin + "/?file=workspace%2Fdrive.tsx";

  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE);

  if (!(await requireOwner())) return NextResponse.redirect(home + "&google=forbidden");
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(home + "&google=error&reason=" + encodeURIComponent(url.searchParams.get("error")!));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(home + "&google=error");
  }

  try {
    await exchangeGoogleCode(code, `${url.origin}/api/google/callback`);
    return NextResponse.redirect(home + "&google=connected");
  } catch (e) {
    const reason = encodeURIComponent((e as Error).message.slice(0, 200));
    return NextResponse.redirect(home + "&google=error&reason=" + reason);
  }
}
