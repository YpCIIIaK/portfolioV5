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
  lang?: string;
  viewport?: string;
  touch?: boolean;
  webdriver?: boolean;
  visitorId?: string;
  visitNo?: number;
  activeMs?: number;
  firstActionMs?: number;
  route?: string[];
  actions?: string[];
  errors?: string[];
  ref?: string;
  firstRef?: string;
  utm?: string;
  dpr?: number;
  dark?: boolean;
  net?: string;
  interactions?: number;
  maxScroll?: number;
}

interface IpInfo {
  org: string;
  isp: string;
  asn?: number;
  ipTz?: string;
}

/** Provider / ASN for the IP (ipwho.is, free, no key). Never blocks the beacon for long. */
async function ipInfo(ip: string): Promise<IpInfo | null> {
  if (!ip) return null;
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,connection,timezone`, {
      signal: AbortSignal.timeout(2500),
    });
    const j = await r.json();
    if (!j?.success) return null;
    return { org: j.connection?.org ?? "", isp: j.connection?.isp ?? "", asn: j.connection?.asn, ipTz: j.timezone?.id };
  } catch {
    return null;
  }
}

const DATACENTER = /google|amazon|aws|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|vultr|oracle|alibaba|tencent|cloudflare|leaseweb|contabo|choopa|m247|datacamp|scaleway|hosting|server|cloud/i;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|telegrambot|whatsapp|discord|slack|curl|wget|python|axios|node-fetch|go-http|scrapy|phantom|puppeteer|playwright/i;

/** Human-readable traffic source from the referrer and UTM tags. */
function describeSource(referrer: string, utm: string) {
  const known: [RegExp, string][] = [
    [/hh\.(ru|kz)|headhunter/, "hh"],
    [/linkedin\.|lnkd\.in/, "LinkedIn"],
    [/t\.me|telegram/, "Telegram"],
    [/github\.com/, "GitHub"],
    [/google\./, "Google"],
    [/yandex\.|ya\.ru/, "Яндекс"],
    [/habr\.com/, "Хабр"],
    [/himalayas|remotive|remoteok|weworkremotely|jobicy/, "доска вакансий"],
    [/mail\.|outlook|gmail/, "почта"],
  ];
  let label = "прямой заход";
  if (referrer) {
    const hit = known.find(([re]) => re.test(referrer));
    label = hit ? `${hit[1]} (${referrer.slice(0, 80)})` : referrer.slice(0, 100);
  }
  return utm ? `${label} · utm: ${utm}` : label;
}

/** "Chrome 130 · macOS" instead of the raw user agent. */
function describeUa(ua: string) {
  const os =
    /iPhone|iPad/.test(ua) ? `iOS ${(ua.match(/OS (\d+)[_.](\d+)/) ?? []).slice(1, 3).join(".")}`.trim()
    : /Android/.test(ua) ? `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ""}`.trim()
    : /Windows NT/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Linux/.test(ua) ? "Linux" : "?";
  const browser =
    ua.match(/Edg\/(\d+)/) ? `Edge ${ua.match(/Edg\/(\d+)/)![1]}`
    : ua.match(/OPR\/(\d+)/) ? `Opera ${ua.match(/OPR\/(\d+)/)![1]}`
    : ua.match(/YaBrowser\/(\d+)/) ? `Yandex ${ua.match(/YaBrowser\/(\d+)/)![1]}`
    : ua.match(/Firefox\/(\d+)/) ? `Firefox ${ua.match(/Firefox\/(\d+)/)![1]}`
    : ua.match(/Chrome\/(\d+)/) ? `Chrome ${ua.match(/Chrome\/(\d+)/)![1]}`
    : ua.match(/Version\/(\d+).*Safari/) ? `Safari ${ua.match(/Version\/(\d+)/)![1]}` : "?";
  const device = /iPhone|Android.*Mobile/.test(ua) ? "телефон" : /iPad|Android/.test(ua) ? "планшет" : "компьютер";
  return `${browser} · ${os} · ${device}`;
}

/** Signals that the visit is a crawler / link preview / automated check rather than a person. */
function botSignals(body: VisitBody, info: IpInfo | null, ua: string, ipTz?: string) {
  const out: string[] = [];
  if (body.webdriver) out.push("автоматизированный браузер (webdriver)");
  if (BOT_UA.test(ua)) out.push("user agent бота");
  if (info && DATACENTER.test(`${info.org} ${info.isp}`)) out.push(`дата-центр (${info.org || info.isp})`);
  if (body.tz === "UTC") out.push("таймзона UTC");
  if (ipTz && body.tz && body.tz !== "UTC" && ipTz !== body.tz) out.push(`таймзона браузера ≠ IP (${ipTz}) — возможно VPN`);
  if (/iPhone/.test(ua) && body.screen && !body.touch && body.touch !== undefined) out.push("iPhone без тач-экрана — эмуляция");
  if ((body.durationMs ?? 0) < 3000 && !body.interactions) out.push("меньше 3 сек без действий");
  return out;
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
  const info = await ipInfo(geo.ip);
  const ua = body.ua ?? req.headers.get("user-agent") ?? "";
  const bot = botSignals(body, info, ua, info?.ipTz);
  const verdict = bot.length >= 2 ? "🤖 Скорее всего бот" : bot.length === 1 ? "🤔 Возможно бот" : "🧑 Похоже на человека";
  const returning = (body.visitNo ?? 1) > 1 ? `🔁 Повторный визит №${body.visitNo} (id ${body.visitorId})` : "🆕 Первый визит";
  const top = (body.files ?? [])
    .slice()
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)
    .map((f) => `  • ${f.file} — ${fmtDuration(f.ms)}`)
    .join("\n");
  const route = (body.route ?? []).map((f) => f.split("/").pop()).join(" → ");
  const actions = (body.actions ?? []).map((a) => `  • ${a}`).join("\n");
  const stars = (body.actions ?? []).filter((a) => a.startsWith("⭐")).map((a) => a.slice(2));
  const errors = (body.errors ?? []).map((e) => `  • ${e}`).join("\n");
  const source = describeSource(body.referrer ?? "", body.utm ?? "");
  const extras = [
    body.dpr ? `DPR ${body.dpr}` : "",
    body.dark === undefined ? "" : body.dark ? "тёмная тема" : "светлая тема",
    body.net ? `сеть: ${body.net}` : "",
  ].filter(Boolean).join(" · ");

  const details = [
    body.ref ? `📨 По ссылке из отклика: ${body.ref}${body.firstRef ? ` (впервые пришёл по ${body.firstRef})` : ""}` : "",
    `📍 Откуда: ${geo.label}${geo.ip ? ` (${geo.ip})` : ""}`,
    info ? `🏢 Провайдер: ${info.org || info.isp}${info.asn ? ` (AS${info.asn})` : ""}` : "",
    `🔗 Источник: ${source}`,
    `⏱️ На сайте: ${fmtDuration(body.durationMs ?? 0)}, активно ${fmtDuration(body.activeMs ?? 0)}${body.firstActionMs ? ` · первое действие через ${fmtDuration(body.firstActionMs)}` : ""}`,
    `🖱️ Действий: ${body.interactions ?? 0} · прокрутка до ${body.maxScroll ?? 0}%`,
    returning,
    `${verdict}${bot.length ? `: ${bot.join("; ")}` : ""}`,
    "",
    ua ? `🧭 Устройство: ${describeUa(ua)}${body.touch ? " · тач" : ""}` : "",
    body.screen ? `🖥️ Экран: ${body.screen}${body.viewport ? `, окно ${body.viewport}` : ""}` : "",
    extras ? `⚙️ ${extras}` : "",
    body.lang ? `🗣️ Языки: ${body.lang}` : "",
    body.tz ? `🕒 Таймзона: ${body.tz}` : "",
    body.path && body.path !== "/" ? `🧷 Страница входа: ${body.path}` : "",
    "",
    route ? `🧭 Путь: ${route}` : "",
    "📂 Время по файлам:",
    top || "  (не открывал файлы)",
    actions ? "\n🎯 Действия:\n" + actions : "",
    errors ? "\n⚠️ Ошибки на странице:\n" + errors : "",
    ua ? `\nUA: ${ua}` : "",
  ]
    .filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
    .join("\n");

  const who = body.ref ? `📨 ${body.ref} смотрит твоё портфолио` : `${bot.length >= 2 ? "🤖" : "👀"} Кто-то смотрит твоё портфолио`;
  const headline = [who, stars.length ? `⭐ ${stars.join(", ")}` : ""].filter(Boolean).join("\n");
  // Plain-text version — used for email / webhook / dev log.
  const text = `${headline}\n\n${details}`;

  // Telegram version — a normal visit is low-priority, so it goes *silently* with
  // the details under a spoiler. Visits from an application link (?ref=) or with
  // a key action (CV, Telegram, email) arrive with sound.
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const important = Boolean(body.ref) || stars.length > 0;
  const tgHtml = `${esc(headline)}\n\n<tg-spoiler>${esc(details)}</tg-spoiler>`;

  // 0) Telegram bot (preferred) — fires independently of email/webhook.
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChat,
          text: tgHtml,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          disable_notification: !important,
        }),
      });
    } catch (err) {
      console.error("telegram failed", err);
    }
  }

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
          subject: body.ref ? `📨 ${body.ref} смотрит портфолио` : `👀 Визит на портфолио — ${geo.label}`,
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
