import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supabaseConfigured, sbSelect, sbUpdate } from "@/lib/supabase";
import { notifyOwner } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * Calendar reminder tick. Meant to be called on a schedule (Supabase pg_cron via
 * pg_net, or any external cron) — see docs/workspace-schema.sql.
 *
 * Auth: either a matching `x-cron-secret` header/`?secret=` (for the scheduler)
 * or a logged-in owner session (for manual testing from the browser). If
 * CRON_SECRET is unset the scheduled path is disabled, but the owner path works.
 *
 * For every event whose reminder window has opened and that hasn't been notified
 * yet, it fans a message to Telegram + email, then stamps `notified_at` so the
 * next tick skips it. Idempotent: safe to run as often as you like.
 */

const TZ = process.env.WORKSPACE_TZ || "Asia/Almaty";
const LEAD_MIN = Number(process.env.WORKSPACE_REMINDER_LEAD_MIN || 30);
const DEFAULT_ALLDAY_TIME = process.env.WORKSPACE_ALLDAY_REMIND_TIME || "09:00";
const GRACE_MS = 6 * 60 * 60 * 1000; // don't fire for events already well past

interface EventRow {
  id: string;
  title: string;
  date: string;
  time: string | null;
  note: string | null;
  priority: string;
  notified_at: string | null;
}

/** Milliseconds to add to a UTC instant to express it as wall-clock in `tz`. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((a, p) => {
      a[p.type] = p.value;
      return a;
    }, {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUTC - date.getTime();
}

/** Convert a wall-clock date/time in `tz` to a UTC epoch (ms). */
function zonedToEpoch(dateStr: string, timeStr: string, tz: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, (mo || 1) - 1, d || 1, hh || 0, mm || 0);
  return guess - tzOffsetMs(new Date(guess), tz);
}

function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (provided && provided === secret) return Promise.resolve(true);
  }
  return requireOwner().then((o) => !!o);
}

function fmtLead(ms: number): string {
  if (ms <= 0) return "сейчас";
  const min = Math.round(ms / 60000);
  if (min < 60) return `через ${min} мин`;
  const h = Math.round(min / 60);
  return `через ${h} ч`;
}

async function run(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  }

  const now = Date.now();
  // Look back one day (timezone slack) and forward far enough to catch the lead window.
  const fromDay = new Date(now - 36 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await sbSelect<EventRow>(
    "ws_events",
    `select=*&notified_at=is.null&date=gte.${fromDay}&order=date.asc`,
  );

  const sent: string[] = [];
  for (const e of rows) {
    const time = (e.time && /^\d{1,2}:\d{2}/.test(e.time) ? e.time : DEFAULT_ALLDAY_TIME).slice(0, 5);
    const startMs = zonedToEpoch(e.date, time, TZ);
    const remindAt = startMs - LEAD_MIN * 60 * 1000;

    // Fire once the reminder window has opened, unless the event is long gone.
    if (now < remindAt) continue;
    if (now > startMs + GRACE_MS) {
      // Too old to be useful — mark done so we stop reconsidering it.
      await sbUpdate("ws_events", `id=eq.${encodeURIComponent(e.id)}`, { notified_at: new Date().toISOString() });
      continue;
    }

    const when = e.time ? `🗓 ${e.date} в ${time}` : `🗓 ${e.date} (весь день)`;
    const text = [
      `🔔 Напоминание · ${fmtLead(startMs - now)}`,
      "",
      e.title,
      when,
      e.note ? `📝 ${e.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const subject = `🔔 ${e.title} — ${fmtLead(startMs - now)}`;
    await notifyOwner(subject, text);
    await sbUpdate("ws_events", `id=eq.${encodeURIComponent(e.id)}`, { notified_at: new Date().toISOString() });
    sent.push(e.id);
  }

  return NextResponse.json({ ok: true, checked: rows.length, sent: sent.length });
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}
