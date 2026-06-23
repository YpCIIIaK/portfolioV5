"use client";

import { useEffect, useMemo, useState } from "react";
import { StickyNote, CalendarDays, Clock, Cloud } from "lucide-react";
import { DEMO_NOTES, DEMO_EVENTS, type Note, type WsEvent } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { useEditor } from "@/lib/store";
import { GuestBanner } from "./GuestBanner";

/* ---- clocks ---------------------------------------------------------- */

const ZONES = [
  { label: "Астана", tz: "Asia/Almaty" }, // UTC+5 — рабочий пояс
  { label: "Москва", tz: "Europe/Moscow" }, // UTC+3
];

function zoneTime(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

function Clocks() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  return (
    <Card title="Время" Icon={Clock}>
      <div className="flex gap-4">
        {ZONES.map((z) => (
          <div key={z.tz} className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-vsc-muted">{z.label}</div>
            <div className="font-mono text-[26px] leading-tight text-vsc-bright">{zoneTime(z.tz, now)}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-vsc-muted">Астана = МСК&nbsp;+2&nbsp;ч</p>
    </Card>
  );
}

/* ---- weather (Open-Meteo, без ключа) --------------------------------- */

const CITIES = [
  { name: "Астана", lat: 51.18, lon: 71.45 },
  { name: "Москва", lat: 55.75, lon: 37.62 },
  { name: "Алматы", lat: 43.24, lon: 76.92 },
];

interface Wx {
  temp: number;
  code: number;
}

function wxIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

function Weather() {
  const [data, setData] = useState<(Wx | null)[]>(() => CITIES.map(() => null));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all(
      CITIES.map(async (c) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error();
          const j = await res.json();
          return { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code } as Wx;
        } catch {
          return null;
        }
      })
    ).then((r) => {
      if (!alive) return;
      setData(r);
      setFailed(r.every((x) => x === null));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card title="Погода" Icon={Cloud}>
      {failed ? (
        <p className="text-[12px] text-vsc-muted">Не удалось загрузить погоду.</p>
      ) : (
        <div className="flex gap-3">
          {CITIES.map((c, i) => {
            const w = data[i];
            return (
              <div key={c.name} className="flex-1 rounded border border-vsc-line bg-vsc-bg px-2 py-2 text-center">
                <div className="text-[11px] text-vsc-muted">{c.name}</div>
                <div className="text-[22px] leading-tight">{w ? wxIcon(w.code) : "·"}</div>
                <div className="text-[15px] text-vsc-bright">{w ? `${w.temp}°` : "…"}</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---- notes / events -------------------------------------------------- */

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function NotesWidget() {
  const { items } = useCollection<Note>("notes", DEMO_NOTES);
  const openFile = useEditor((s) => s.openFile);
  const recent = useMemo(
    () => [...items].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 3),
    [items]
  );

  return (
    <Card title="Заметки" Icon={StickyNote} onTitle={() => openFile("workspace/notes.md")}>
      {recent.length === 0 ? (
        <p className="text-[12px] text-vsc-muted">Заметок пока нет.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((n) => (
            <button
              key={n.id}
              onClick={() => openFile("workspace/notes.md")}
              className="rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-left hover:border-vsc-muted"
            >
              <div className="truncate text-[13px] text-vsc-bright">{n.title?.trim() || "Без названия"}</div>
              {n.body?.trim() && (
                <div className="mt-0.5 line-clamp-2 text-[12px] text-vsc-muted">{n.body.trim()}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function AgendaWidget() {
  const { items } = useCollection<WsEvent>("events", DEMO_EVENTS);
  const openFile = useEditor((s) => s.openFile);
  const today = isoDay(0);
  const tomorrow = isoDay(1);

  const groups = useMemo(() => {
    const pick = (day: string) =>
      items
        .filter((e) => e.date === day)
        .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
    return [
      { label: "Сегодня", events: pick(today) },
      { label: "Завтра", events: pick(tomorrow) },
    ];
  }, [items, today, tomorrow]);

  return (
    <Card title="Календарь" Icon={CalendarDays} onTitle={() => openFile("workspace/calendar.tsx")}>
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-vsc-muted">{g.label}</div>
            {g.events.length === 0 ? (
              <p className="text-[12px] text-vsc-muted/70">— ничего не запланировано</p>
            ) : (
              <div className="flex flex-col gap-1">
                {g.events.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded px-1 py-0.5">
                    <span className="w-12 shrink-0 font-mono text-[12px] text-vsc-yellow">{e.time ?? "—"}</span>
                    <span className="truncate text-[13px] text-vsc-text">{e.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---- shell ----------------------------------------------------------- */

function Card({
  title,
  Icon,
  children,
  onTitle,
}: {
  title: string;
  Icon: typeof Clock;
  children: React.ReactNode;
  onTitle?: () => void;
}) {
  return (
    <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
      <button
        onClick={onTitle}
        disabled={!onTitle}
        className={`mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-vsc-muted ${
          onTitle ? "hover:text-vsc-text" : "cursor-default"
        }`}
      >
        <Icon size={14} /> {title}
      </button>
      {children}
    </div>
  );
}

export function DashboardPanel() {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="mx-auto max-w-4xl px-8 py-6">
      <h1 className="mb-5 text-[22px] font-semibold text-vsc-bright">{greeting} 👋</h1>
      <GuestBannerIfNeeded />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Clocks />
        <Weather />
        <NotesWidget />
        <AgendaWidget />
      </div>
    </div>
  );
}

function GuestBannerIfNeeded() {
  const { readonly } = useCollection<Note>("notes", DEMO_NOTES);
  if (!readonly) return null;
  return (
    <div className="mb-4">
      <GuestBanner what="личный кабинет" />
    </div>
  );
}
