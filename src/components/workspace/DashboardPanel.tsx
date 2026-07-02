"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTodo, CalendarDays, Clock, Cloud, Mail, Check } from "lucide-react";
import { DEMO_TASKS, DEMO_EVENTS, wsUpdate, type Task, type WsEvent } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { useMailbox } from "./useMailbox";
import { useEditor } from "@/lib/store";
import { GuestBanner } from "./GuestBanner";
import { PriorityDot, priorityRank } from "./wsStyle";

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

function dueLabel(due: string | null): { text: string; overdue: boolean } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { text: "сегодня", overdue: false };
  if (diff === 1) return { text: "завтра", overdue: false };
  if (diff < 0) return { text: diff === -1 ? "вчера" : "просрочено", overdue: true };
  return { text: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }), overdue: false };
}

function TasksWidget() {
  const { items, setItems, readonly } = useCollection<Task>("tasks", DEMO_TASKS);
  const openFile = useEditor((s) => s.openFile);

  const open = useMemo(
    () =>
      items
        .filter((t) => !t.done)
        .sort((a, b) => {
          const pr = priorityRank(b.priority) - priorityRank(a.priority);
          if (pr !== 0) return pr;
          return (a.due ?? "9999").localeCompare(b.due ?? "9999");
        })
        .slice(0, 5),
    [items]
  );
  const openCount = items.filter((t) => !t.done).length;

  async function complete(t: Task) {
    if (readonly) return;
    setItems(items.map((x) => (x.id === t.id ? { ...x, done: true } : x)));
    await wsUpdate<Task>("tasks", t.id, { done: true });
  }

  return (
    <Card title={`Задачи · ${openCount}`} Icon={ListTodo} onTitle={() => openFile("workspace/tasks.todo")}>
      {open.length === 0 ? (
        <p className="text-[12px] text-vsc-muted">Активных задач нет 🎉</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {open.map((t) => {
            const due = dueLabel(t.due);
            return (
              <div key={t.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-vsc-hover">
                <button
                  onClick={() => complete(t)}
                  disabled={readonly}
                  title="Выполнить"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-vsc-muted text-transparent hover:border-vsc-green hover:text-vsc-green disabled:opacity-50"
                >
                  <Check size={11} />
                </button>
                <PriorityDot priority={t.priority} />
                <span className="flex-1 truncate text-[13px] text-vsc-text">{t.title}</span>
                {due && (
                  <span className={`shrink-0 text-[11px] ${due.overdue ? "text-red-400" : "text-vsc-muted"}`}>{due.text}</span>
                )}
              </div>
            );
          })}
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
                    <PriorityDot priority={e.priority} />
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

function MailWidget() {
  const { items, loading, live } = useMailbox(5);
  const openFile = useEditor((s) => s.openFile);

  return (
    <Card title="Почта" Icon={Mail} onTitle={() => openFile("workspace/mail.tsx")}>
      {loading ? (
        <p className="text-[12px] text-vsc-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-vsc-muted">Входящих нет.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((m) => (
            <button
              key={m.uid}
              onClick={() => openFile("workspace/mail.tsx")}
              className="flex items-center gap-2 rounded px-1 py-1.5 text-left hover:bg-vsc-hover"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.unread ? "bg-vsc-accent" : "bg-transparent"}`} />
              <span className={`w-24 shrink-0 truncate text-[12px] ${m.unread ? "font-medium text-vsc-bright" : "text-vsc-muted"}`}>
                {m.from || "—"}
              </span>
              <span className={`flex-1 truncate text-[12px] ${m.unread ? "text-vsc-text" : "text-vsc-muted"}`}>
                {m.subject}
              </span>
            </button>
          ))}
          {!live && <p className="mt-1 px-1 text-[11px] text-vsc-muted/70">демо · подключи IMAP в env</p>}
        </div>
      )}
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
        <TasksWidget />
        <AgendaWidget />
        <MailWidget />
        <Clocks />
        <Weather />
      </div>
    </div>
  );
}

function GuestBannerIfNeeded() {
  const { readonly } = useCollection<Task>("tasks", DEMO_TASKS);
  if (!readonly) return null;
  return (
    <div className="mb-4">
      <GuestBanner what="личный кабинет" />
    </div>
  );
}
