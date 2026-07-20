import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { cleanLatestBrain } from "@/lib/brain";

export const runtime = "nodejs";

/**
 * Чистка последнего снапшота мозга от мусора.
 *
 * POST без `apply` — только план (что удалится и почему). С `apply: true` —
 * применяет. Разделение намеренное: снапшот один, удаление необратимо, поэтому
 * список должен быть показан до, а не после.
 *
 * `dropLonely` дополнительно выносит узлы без связей с importance ≤ 2.
 */
export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { apply?: boolean; dropLonely?: boolean };

  try {
    const r = await cleanLatestBrain({ apply: !!body.apply, dropLonely: !!body.dropLonely });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
