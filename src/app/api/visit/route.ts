import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface VisitBody {
  durationMs?: number;
  files?: { file: string; ms: number }[];
  referrer?: string;
  tz?: string;
  screen?: string;
  ua?: string;
  path?: string;
}

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL ?? "bigboyvova01@gmail.com";

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} мин ${s % 60} сек` : `${s} сек`;
}

function geoFrom(req: Request) {
  const h = req.headers;
  const dec = (v: string | null) => (v ? decodeURIComponent(v) : "");
  const city = dec(h.get("x-vercel-ip-city"));
  const country = dec(h.get("x-vercel-ip-country"));
  const region = dec(h.get("x-vercel-ip-country-region"));
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const parts = [city, region, country].filter(Boolean);
  return { label: parts.join(", ") || "неизвестно", ip };
}

export async function POST(req: Request) {
  let body: VisitBody = {};
  try {
    body = await req.json();
  } catch {
    /* sendBeacon may send text; ignore */
  }

  const geo = geoFrom(req);
  const dur = fmtDuration(body.durationMs ?? 0);
  const top = (body.files ?? [])
    .slice()
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)
    .map((f) => `  • ${f.file} — ${fmtDuration(f.ms)}`)
    .join("\n");

  const text = [
    "👀 Кто-то смотрит твоё портфолио",
    "",
    `📍 Откуда: ${geo.label}${geo.ip ? ` (${geo.ip})` : ""}`,
    `⏱️ Провёл на сайте: ${dur}`,
    body.referrer ? `🔗 Источник: ${body.referrer}` : "🔗 Источник: прямой заход",
    body.tz ? `🕒 Таймзона: ${body.tz}` : "",
    body.screen ? `🖥️ Экран: ${body.screen}` : "",
    body.ua ? `🧭 Устройство: ${body.ua}` : "",
    "",
    "📂 Смотрел файлы:",
    top || "  (не открывал файлы)",
  ]
    .filter(Boolean)
    .join("\n");

  // 1) Resend (email)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Portfolio <onboarding@resend.dev>",
          to: NOTIFY_EMAIL,
          subject: `👀 Визит на портфолио — ${geo.label}`,
          text,
        }),
      });
    } catch (err) {
      console.error("resend failed", err);
    }
  } else if (process.env.CONTACT_WEBHOOK) {
    // 2) Fallback: webhook
    try {
      await fetch(process.env.CONTACT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
    } catch {
      /* ignore */
    }
  } else {
    // 3) Dev fallback: just log
    console.log("[visit]\n" + text);
  }

  return NextResponse.json({ ok: true });
}
