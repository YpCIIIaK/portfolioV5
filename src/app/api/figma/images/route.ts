import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getImages, parseFigmaUrl, FigmaError } from "@/lib/figma/client";

export const runtime = "nodejs";

/**
 * POST /api/figma/images
 * body: { token?, url|fileKey, ids: string[], format?, scale? }
 * Returns rendered preview image URLs keyed by node id.
 */
export async function POST(req: NextRequest) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const token = body.token || process.env.FIGMA_TOKEN;
    const { url, fileKey: fk, ids, format, scale } = body;
    if (!token || !ids?.length) {
      return NextResponse.json(
        { error: "token и ids обязательны" },
        { status: 400 },
      );
    }
    const fileKey = fk || parseFigmaUrl(url).fileKey;
    const res = await getImages(token, fileKey, ids, format ?? "png", scale ?? 2);
    if (res.err) {
      return NextResponse.json({ error: res.err }, { status: 502 });
    }
    return NextResponse.json({ images: res.images });
  } catch (e) {
    const err = e as FigmaError;
    return NextResponse.json(
      { error: err.message ?? "Неизвестная ошибка" },
      { status: err.status ?? 500 },
    );
  }
}
