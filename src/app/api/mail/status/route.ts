import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail-server";

export const runtime = "nodejs";

/** Owner-only: is an IMAP mailbox configured? */
export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: mailConfigured() });
}
