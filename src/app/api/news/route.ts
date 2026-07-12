import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/news";

export const runtime = "nodejs";

/** Public compact news feed: trending repos + tech + AI headlines. */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    const data = await fetchNews(force);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
