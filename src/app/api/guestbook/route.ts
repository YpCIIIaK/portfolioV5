import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseConfigured, sbSelect, sbInsert, sbDelete } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Public guestbook. Anyone can read; writing requires a GitHub login (any
 * account, not just the owner) — the author identity comes from the session,
 * never from the request body. Deleting: owner — anything, author — own rows.
 */

export interface GuestbookEntry {
  id: string;
  github_id: number;
  login: string;
  name: string;
  avatar: string;
  message: string;
  created_at: string;
}

const MessageSchema = z.object({ message: z.string().trim().min(2, "Слишком коротко").max(500) });

const TABLE = "ws_guestbook";

export async function GET() {
  if (!supabaseConfigured()) return NextResponse.json({ items: [], configured: false });
  const rows = await sbSelect<GuestbookEntry>(TABLE, "select=*&order=created_at.desc&limit=100");
  return NextResponse.json({ items: rows, configured: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войди через GitHub, чтобы оставить запись" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Гостевая книга не настроена" }, { status: 503 });

  const parsed = MessageSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректное сообщение" }, { status: 422 });
  }

  // Простейший анти-спам: не чаще одной записи в минуту с одного аккаунта.
  const recent = await sbSelect<{ created_at: string }>(
    TABLE,
    `select=created_at&github_id=eq.${session.id}&order=created_at.desc&limit=1`,
  );
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60_000) {
    return NextResponse.json({ error: "Слишком часто — подожди минуту" }, { status: 429 });
  }

  const row = await sbInsert<GuestbookEntry>(TABLE, {
    github_id: session.id,
    login: session.login,
    name: session.name,
    avatar: session.avatar,
    message: parsed.data.message,
  });
  return NextResponse.json({ item: row }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "не настроено" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  if (session.owner) {
    await sbDelete(TABLE, `id=eq.${encodeURIComponent(id)}`);
  } else {
    // Не владелец может удалить только собственную запись.
    await sbDelete(TABLE, `id=eq.${encodeURIComponent(id)}&github_id=eq.${session.id}`);
  }
  return NextResponse.json({ ok: true });
}
