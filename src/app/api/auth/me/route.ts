import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/** Current session for the client. Reports whether GitHub login is even configured. */
export async function GET() {
  const session = await getSession();
  const configured = !!process.env.GITHUB_CLIENT_ID;
  if (!session) return NextResponse.json({ user: null, configured });
  return NextResponse.json({
    user: {
      login: session.login,
      name: session.name,
      avatar: session.avatar,
      owner: session.owner,
    },
    configured,
  });
}
