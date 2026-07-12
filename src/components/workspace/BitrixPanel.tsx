"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, RefreshCw, ArrowLeft, MessageSquare, ListTodo, Newspaper, ExternalLink, Dot } from "lucide-react";
import { getCached, setCached, invalidate } from "@/lib/cache";

/** Client-side mirrors of the shapes returned by /api/bitrix. */
interface BxTask { id: string; title: string; status: string; statusCode: number; deadline: string | null; responsible: string | null; groupName: string | null; url: string | null }
interface BxTaskFull { id: string; title: string; description: string; status: string; statusCode: number; createdDate: string | null; deadline: string | null; closedDate: string | null; creator: string | null; responsible: string | null; accomplices: string[]; auditors: string[]; groupName: string | null; url: string | null }
interface BxChat { dialogId: string; title: string; type: string; lastMessage: string; lastDate: string | null; unread: boolean }
interface BxMessage { id: number; author: string; text: string; date: string }
interface BxFeedPost { id: string; title: string; text: string; author: string | null; date: string | null }

type Tab = "tasks" | "chats" | "feed";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}

function fullДата(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-vsc-muted">{label}</div>
      <div className="text-[13px] text-vsc-text">{value}</div>
    </div>
  );
}

const STATUS_COLOR: Record<number, string> = {
  2: "#60a5fa", // ждёт выполнения
  3: "#fbbf24", // выполняется
  4: "#c084fc", // ждёт контроля
  5: "#4ade80", // завершена
  6: "#8b8b8b", // отложена
};

async function getJson<T>(qs: string): Promise<T> {
  const res = await fetch(`/api/bitrix?${qs}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.items as T;
}

export function BitrixPanel() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<BxTask[]>(() => getCached<BxTask[]>("bitrix:tasks") ?? []);
  const [chats, setChats] = useState<BxChat[]>(() => getCached<BxChat[]>("bitrix:chats") ?? []);
  const [feed, setFeed] = useState<BxFeedPost[]>(() => getCached<BxFeedPost[]>("bitrix:feed") ?? []);
  const [loading, setLoading] = useState(() => !getCached("bitrix:tasks"));
  const [error, setError] = useState("");

  // open dialog
  const [openChat, setOpenChat] = useState<BxChat | null>(null);
  const [messages, setMessages] = useState<BxMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  // open task detail
  const [openTask, setOpenTask] = useState<BxTaskFull | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  const [fetchKey, setFetchKey] = useState(0);

  // On tab switch, seed the view from cache during render (no fetch if fresh).
  const [prevTab, setPrevTab] = useState(tab);
  if (prevTab !== tab) {
    setPrevTab(tab);
    if (tab === "tasks") { const c = getCached<BxTask[]>("bitrix:tasks"); if (c) setTasks(c); setLoading(!c); }
    else if (tab === "chats") { const c = getCached<BxChat[]>("bitrix:chats"); if (c) setChats(c); setLoading(!c); }
    else { const c = getCached<BxFeedPost[]>("bitrix:feed"); if (c) setFeed(c); setLoading(!c); }
    setError("");
  }

  // Drops the cache and refetches the current tab (refresh button).
  const forceReload = useCallback((t: Tab) => {
    invalidate(`bitrix:${t}`);
    setLoading(true);
    setError("");
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const key = `bitrix:${tab}`;
    // Fresh cache is already reflected in state — skip the network round-trip.
    if (getCached(key)) return;
    let cancelled = false;
    (async () => {
      try {
        if (tab === "tasks") { const d = await getJson<BxTask[]>("scope=tasks"); if (!cancelled) { setTasks(d); setCached(key, d); } }
        if (tab === "chats") { const d = await getJson<BxChat[]>("scope=chats"); if (!cancelled) { setChats(d); setCached(key, d); } }
        if (tab === "feed") { const d = await getJson<BxFeedPost[]>("scope=feed"); if (!cancelled) { setFeed(d); setCached(key, d); } }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, fetchKey]);

  async function readTask(id: string) {
    setTaskLoading(true);
    setOpenTask(null);
    try {
      const res = await fetch(`/api/bitrix?scope=task&id=${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setOpenTask(json.item as BxTaskFull);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTaskLoading(false);
    }
  }

  if (taskLoading || openTask) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <button
          onClick={() => { setOpenTask(null); setTaskLoading(false); }}
          className="mb-4 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text"
        >
          <ArrowLeft size={15} /> К задачам
        </button>
        {taskLoading || !openTask ? (
          <p className="text-[13px] text-vsc-muted">Загрузка задачи…</p>
        ) : (
          <div>
            <div className="mb-3 flex items-start gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[openTask.statusCode] || "#8b8b8b" }} title={openTask.status} />
              <h1 className="text-[18px] font-semibold text-vsc-bright">{openTask.title}</h1>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-vsc-line bg-vsc-sidebar p-4 sm:grid-cols-2">
              <Field label="Статус" value={openTask.status} />
              <Field label="Группа / проект" value={openTask.groupName || "—"} />
              <Field label="Кто поставил" value={openTask.creator || "—"} />
              <Field label="Исполнитель" value={openTask.responsible || "—"} />
              <Field label="Соисполнители" value={openTask.accomplices.length ? openTask.accomplices.join(", ") : "—"} />
              <Field label="Наблюдатели" value={openTask.auditors.length ? openTask.auditors.join(", ") : "—"} />
              <Field label="Создана" value={fullДата(openTask.createdDate)} />
              <Field label="Дедлайн" value={fullДата(openTask.deadline)} />
              {openTask.closedDate && <Field label="Завершена" value={fullДата(openTask.closedDate)} />}
            </div>

            <div className="mb-1 text-[12px] font-medium uppercase tracking-wide text-vsc-muted">Описание</div>
            {openTask.description ? (
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-vsc-text">{openTask.description}</p>
            ) : (
              <p className="text-[13px] text-vsc-muted">Без описания.</p>
            )}

            {openTask.url && (
              <a href={openTask.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-vsc-light-blue hover:text-vsc-bright">
                <ExternalLink size={14} /> Открыть в Bitrix24
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  async function readChat(c: BxChat) {
    setOpenChat(c);
    setMsgLoading(true);
    try {
      setMessages(await getJson<BxMessage[]>(`scope=messages&dialog=${encodeURIComponent(c.dialogId)}`));
    } catch (e) {
      setError((e as Error).message);
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }

  if (openChat) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <button
          onClick={() => setOpenChat(null)}
          className="mb-4 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text"
        >
          <ArrowLeft size={15} /> К чатам
        </button>
        <h1 className="mb-4 text-[18px] font-semibold text-vsc-bright">{openChat.title}</h1>
        {msgLoading ? (
          <p className="text-[13px] text-vsc-muted">Загрузка сообщений…</p>
        ) : messages.length === 0 ? (
          <p className="text-[13px] text-vsc-muted">Сообщений нет.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded border border-vsc-line px-3 py-2">
                <div className="mb-0.5 flex items-center gap-2 text-[12px] text-vsc-muted">
                  <span className="font-medium text-vsc-text">{m.author}</span>
                  <span>{when(m.date)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-vsc-text">{m.text || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const TABS: { key: Tab; label: string; Icon: typeof ListTodo }[] = [
    { key: "tasks", label: "Задачи", Icon: ListTodo },
    { key: "chats", label: "Чаты", Icon: MessageSquare },
    { key: "feed", label: "Лента", Icon: Newspaper },
  ];

  return (
    <div className="mx-auto max-w-3xl px-8 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <Briefcase size={18} /> Bitrix24
        </h1>
        <button
          onClick={() => forceReload(tab)}
          title="Обновить"
          className="rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-4 flex gap-1 border-b border-vsc-line">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[13px] ${
              tab === key ? "border-vsc-accent text-vsc-bright" : "border-transparent text-vsc-muted hover:text-vsc-text"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-[13px] text-vsc-yellow">{error}</p>}
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка…</p>
      ) : tab === "tasks" ? (
        tasks.length === 0 ? (
          <p className="text-[13px] text-vsc-muted">Открытых задач нет.</p>
        ) : (
          <div className="divide-y divide-vsc-line">
            {tasks.map((t) => (
              <div key={t.id} className="group flex items-center gap-3 px-1 py-2.5 hover:bg-vsc-hover">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[t.statusCode] || "#8b8b8b" }} title={t.status} />
                <button onClick={() => readTask(t.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[13px] text-vsc-text">{t.title}</div>
                  <div className="flex items-center gap-1 text-[11px] text-vsc-muted">
                    <span>{t.status}</span>
                    {t.groupName && (<><Dot size={12} /><span className="truncate">{t.groupName}</span></>)}
                    {t.deadline && (<><Dot size={12} /><span>до {when(t.deadline)}</span></>)}
                  </div>
                </button>
                {t.url && (
                  <a href={t.url} target="_blank" rel="noreferrer" title="Открыть в Bitrix24" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      ) : tab === "chats" ? (
        chats.length === 0 ? (
          <p className="text-[13px] text-vsc-muted">Чатов нет.</p>
        ) : (
          <div className="divide-y divide-vsc-line">
            {chats.map((c) => (
              <button
                key={c.dialogId}
                onClick={() => readChat(c)}
                className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-vsc-hover"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.unread ? "bg-vsc-accent" : "bg-transparent"}`} />
                <span className={`w-44 shrink-0 truncate text-[13px] ${c.unread ? "font-semibold text-vsc-bright" : "text-vsc-text"}`}>
                  {c.title}
                </span>
                <span className="flex-1 truncate text-[13px] text-vsc-muted">{c.lastMessage}</span>
                <span className="shrink-0 text-[12px] text-vsc-muted">{when(c.lastDate)}</span>
              </button>
            ))}
          </div>
        )
      ) : feed.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">В ленте пусто.</p>
      ) : (
        <div className="space-y-3">
          {feed.map((p) => (
            <article key={p.id} className="rounded border border-vsc-line px-3 py-2.5">
              {p.title && <h2 className="text-[14px] font-medium text-vsc-bright">{p.title}</h2>}
              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-vsc-text">
                {p.text.length > 600 ? p.text.slice(0, 600) + "…" : p.text}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[11px] text-vsc-muted">
                {p.author && <span>{p.author}</span>}
                {p.author && p.date && <Dot size={12} />}
                {p.date && <span>{when(p.date)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
