import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { listBlocklist, addBlock, removeBlock } from "@/lib/brain-blocklist";

export const runtime = "nodejs";

/** Чёрный список тем мозга: GET — список, POST — добавить, DELETE ?id= — убрать. */

async function guard() {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  return null;
}

export async function GET() {
  const bad = await guard();
  if (bad) return bad;
  return NextResponse.json({ rules: await listBlocklist() });
}

export async function POST(req: Request) {
  const bad = await guard();
  if (bad) return bad;

  const body = (await req.json().catch(() => ({}))) as { pattern?: string };
  const pattern = (body.pattern ?? "").trim();
  // Слишком короткая подстрока вынесла бы пол-графа: «а» есть почти везде.
  if (pattern.length < 2) {
    return NextResponse.json({ error: "нужно минимум 2 символа" }, { status: 400 });
  }
  if (pattern.length > 200) {
    return NextResponse.json({ error: "слишком длинно" }, { status: 400 });
  }

  try {
    await addBlock(pattern);
    return NextResponse.json({ ok: true, rules: await listBlocklist() });
  } catch (e) {
    const msg = (e as Error).message;
    // Уникальный индекс по lower(pattern): повтор — не ошибка, список уже такой.
    if (/duplicate|23505/i.test(msg)) return NextResponse.json({ ok: true, rules: await listBlocklist() });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const bad = await guard();
  if (bad) return bad;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "нужен id" }, { status: 400 });

  try {
    await removeBlock(id);
    return NextResponse.json({ ok: true, rules: await listBlocklist() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
