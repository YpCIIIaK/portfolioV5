"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTodo, CalendarDays, Mail, Check, Briefcase, ExternalLink, Send, User, Users, Radio } from "lucide-react";
import { DEMO_TASKS, DEMO_EVENTS, wsUpdate, type Task, type WsEvent } from "@/lib/workspace";
import { getCached, setCached } from "@/lib/cache";
import { useCollection } from "./useCollection";
import { useMailbox } from "./useMailbox";
import { useEditor } from "@/lib/store";
import { GuestBanner } from "./GuestBanner";
import { PriorityDot, priorityRank } from "./wsStyle";

/* ---- combined time + weather (compact header widget) ----------------- */

const CITIES = [
  { name: "Астана", tz: "Asia/Almaty", lat: 51.18, lon: 71.45 }, // UTC+5 — рабочий пояс
  { name: "Москва", tz: "Europe/Moscow", lat: 55.75, lon: 37.62 }, // UTC+3
];

interface Wx {
  temp: number;
  code: number;
}

function zoneTime(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
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

const WEATHER_KEY = "weather:cities";

/** Compact strip: per-city time + weather. Sits to the right of the greeting. */
function TimeWeather() {
  const [now, setNow] = useState(() => new Date());
  const [wx, setWx] = useState<(Wx | null)[]>(() => getCached<(Wx | null)[]>(WEATHER_KEY) ?? CITIES.map(() => null));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (getCached<(Wx | null)[]>(WEATHER_KEY)) return; // свежий кэш — не дёргаем API
    let alive = true;
    Promise.all(
      CITIES.map(async (c) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code`
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
      setWx(r);
      if (r.some((x) => x !== null)) setCached(WEATHER_KEY, r);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex shrink-0 gap-2">
      {CITIES.map((c, i) => {
        const w = wx[i];
        return (
          <div key={c.name} className="rounded-lg border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-vsc-muted">{c.name}</div>
            <div className="font-mono text-[18px] leading-tight text-vsc-bright">{zoneTime(c.tz, now)}</div>
            <div className="text-[11px] text-vsc-muted">
              {w ? `${wxIcon(w.code)} ${w.temp}°` : "…"}
            </div>
          </div>
        );
      })}
    </div>
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

/* ---- Bitrix24 tasks -------------------------------------------------- */

interface BxTask {
  id: string;
  title: string;
  status: string;
  statusCode: number;
  deadline: string | null;
  groupName: string | null;
  url: string | null;
}

const BX_STATUS_COLOR: Record<number, string> = {
  2: "#60a5fa",
  3: "#fbbf24",
  4: "#c084fc",
  5: "#4ade80",
  6: "#8b8b8b",
};

function bxDeadline(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}

function BitrixTasksWidget() {
  const openFile = useEditor((s) => s.openFile);
  const [tasks, setTasks] = useState<BxTask[]>(() => getCached<BxTask[]>("bitrix:tasks") ?? []);
  const [loading, setLoading] = useState(!getCached<BxTask[]>("bitrix:tasks"));
  const [error, setError] = useState("");

  useEffect(() => {
    // Initial state already seeded from cache; fetch only on a cache miss.
    if (getCached<BxTask[]>("bitrix:tasks")) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bitrix?scope=tasks");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const items = (json.items as BxTask[]) ?? [];
        if (cancelled) return;
        setTasks(items);
        setCached("bitrix:tasks", items);
        setError("");
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card title="Bitrix24 · задачи" Icon={Briefcase} onTitle={() => openFile("workspace/bitrix.tsx")}>
      {loading ? (
        <p className="text-[12px] text-vsc-muted">Загрузка…</p>
      ) : error ? (
        <p className="text-[12px] text-vsc-yellow">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="text-[12px] text-vsc-muted">Открытых задач нет 🎉</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-vsc-hover">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: BX_STATUS_COLOR[t.statusCode] || "#8b8b8b" }}
                title={t.status}
              />
              <span className="flex-1 truncate text-[13px] text-vsc-text">{t.title}</span>
              {t.deadline && <span className="shrink-0 text-[11px] text-vsc-muted">до {bxDeadline(t.deadline)}</span>}
              {t.url && (
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded p-0.5 text-vsc-muted opacity-0 hover:text-vsc-text group-hover:opacity-100"
                  title="Открыть в Bitrix24"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---- Telegram chats -------------------------------------------------- */

interface TgDialog { id: string; title: string; kind: "user" | "group" | "channel"; unread: number; lastMessage: string; lastDate: string | null }

function tgWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}

function TelegramWidget() {
  const openFile = useEditor((s) => s.openFile);
  const [dialogs, setDialogs] = useState<TgDialog[]>(() => getCached<TgDialog[]>("tg:dialogs") ?? []);
  const [loading, setLoading] = useState(!getCached<TgDialog[]>("tg:dialogs"));
  const [error, setError] = useState("");

  useEffect(() => {
    if (getCached<TgDialog[]>("tg:dialogs")) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/telegram?scope=dialogs");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const items = (json.items as TgDialog[]) ?? [];
        if (cancelled) return;
        setDialogs(items);
        setCached("tg:dialogs", items);
        setError("");
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card title="Telegram" Icon={Send} onTitle={() => openFile("workspace/telegram.tsx")}>
      {loading ? (
        <p className="text-[12px] text-vsc-muted">Загрузка…</p>
      ) : error ? (
        <p className="text-[12px] text-vsc-yellow">{error}</p>
      ) : dialogs.length === 0 ? (
        <p className="text-[12px] text-vsc-muted">Чатов нет.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {dialogs.slice(0, 5).map((c) => {
            const Icon = c.kind === "channel" ? Radio : c.kind === "group" ? Users : User;
            return (
              <button
                key={c.id}
                onClick={() => openFile("workspace/telegram.tsx")}
                className="flex items-center gap-2 rounded px-1 py-1 text-left hover:bg-vsc-hover"
              >
                <Icon size={13} className="shrink-0 text-vsc-muted" />
                <span className={`w-28 shrink-0 truncate text-[13px] ${c.unread > 0 ? "font-semibold text-vsc-bright" : "text-vsc-text"}`}>
                  {c.title}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-vsc-muted">{c.lastMessage}</span>
                {c.unread > 0 && (
                  <span className="shrink-0 rounded-full bg-vsc-accent px-1.5 text-[10px] leading-4 text-white">{c.unread}</span>
                )}
                <span className="shrink-0 text-[11px] text-vsc-muted">{tgWhen(c.lastDate)}</span>
              </button>
            );
          })}
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
  Icon: typeof Mail;
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[32px] font-semibold leading-none text-vsc-bright">{greeting} 👋</h1>
        <TimeWeather />
      </div>
      <GuestBannerIfNeeded />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TasksWidget />
        <BitrixTasksWidget />
        <TelegramWidget />
        <AgendaWidget />
        <MailWidget />
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
