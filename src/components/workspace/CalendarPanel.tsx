"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Bell } from "lucide-react";
import { DEMO_EVENTS, wsCreate, wsUpdate, wsDelete, type WsEvent, type Priority } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";
import { PriorityPicker, ColorPicker, PriorityDot, priorityMeta, colorHex, priorityRank } from "./wsStyle";

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Colour used for a compact event chip: custom colour wins, else priority. */
function chipColor(e: WsEvent): string {
  return colorHex(e.color) ?? priorityMeta(e.priority).color;
}

function byTime(a: WsEvent, b: WsEvent): number {
  const t = (a.time ?? "99").localeCompare(b.time ?? "99");
  if (t !== 0) return t;
  return priorityRank(b.priority) - priorityRank(a.priority);
}

export function CalendarPanel() {
  const { items, setItems, loading, readonly } = useCollection<WsEvent>("events", DEMO_EVENTS);
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string>(dayKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [form, setForm] = useState<{ title: string; time: string; note: string; priority: Priority; color: string }>({
    title: "",
    time: "",
    note: "",
    priority: "none",
    color: "",
  });

  const byDay = useMemo(() => {
    const map = new Map<string, WsEvent[]>();
    for (const e of items) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    for (const arr of map.values()) arr.sort(byTime);
    return map;
  }, [items]);

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    const d = new Date(y, m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  function goToday() {
    setCursor({ y: today.getFullYear(), m: today.getMonth() });
    setSelected(dayKey(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  async function addEvent() {
    if (readonly || !form.title.trim()) return;
    const created = await wsCreate<WsEvent>("events", {
      title: form.title.trim(),
      date: selected,
      time: form.time.trim() || null,
      note: form.note.trim() || null,
      priority: form.priority,
      color: form.color,
    });
    setItems([...items, created]);
    setForm({ title: "", time: "", note: "", priority: "none", color: "" });
  }

  async function patch(ev: WsEvent, body: Partial<WsEvent>) {
    setItems(items.map((e) => (e.id === ev.id ? { ...e, ...body } : e)));
    await wsUpdate<WsEvent>("events", ev.id, body as Record<string, unknown>);
  }

  async function remove(id: string) {
    setItems(items.filter((e) => e.id !== id));
    await wsDelete("events", id);
  }

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка календаря…</p>;

  const selectedEvents = byDay.get(selected) ?? [];
  const selDate = new Date(selected + "T00:00:00");
  const selLabel = selDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-7xl px-8 py-4">
      {readonly && <GuestBanner what="календарь" />}

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[17px] font-semibold text-vsc-bright">
          {MONTHS[m]} <span className="text-vsc-muted">{y}</span>
        </h2>
        <div className="ml-auto flex items-center gap-1">
          {!readonly && <ReminderCheck />}
          <button onClick={goToday} className="mr-1 rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
            Сегодня
          </button>
          <button onClick={() => shift(-1)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => shift(1)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WD.map((d, i) => (
          <div key={d} className={`pb-1 text-center text-[11px] font-medium uppercase tracking-wide ${i >= 5 ? "text-vsc-muted/60" : "text-vsc-muted"}`}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = dayKey(y, m, day);
          const evs = byDay.get(key) ?? [];
          const weekend = i % 7 >= 5;
          const isToday = key === dayKey(today.getFullYear(), today.getMonth(), today.getDate());
          const isSel = key === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              className={`flex h-24 flex-col rounded-md border p-1.5 text-left transition ${
                isSel ? "border-vsc-accent ring-1 ring-vsc-accent" : "border-vsc-line hover:border-vsc-muted"
              } ${weekend ? "bg-vsc-bg" : "bg-vsc-sidebar"}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[12px] ${
                  isToday ? "bg-vsc-accent font-semibold text-white" : weekend ? "text-vsc-muted" : "text-vsc-text"
                }`}
              >
                {day}
              </span>
              <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                {evs.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: chipColor(e) }}
                  >
                    {e.time && <span className="opacity-90">{e.time}</span>}
                    <span className="truncate">{e.title}</span>
                  </span>
                ))}
                {evs.length > 3 && <span className="pl-1 text-[10px] text-vsc-muted">+{evs.length - 3} ещё</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays size={15} className="text-vsc-muted" />
          <span className="text-[14px] font-medium capitalize text-vsc-bright">{selLabel}</span>
          <span className="text-[12px] text-vsc-muted">· {selectedEvents.length}</span>
        </div>

        <div className="flex flex-col gap-1">
          {selectedEvents.map((e) => (
            <EventRow key={e.id} ev={e} onPatch={patch} onRemove={remove} readonly={readonly} />
          ))}
          {selectedEvents.length === 0 && <p className="text-[13px] text-vsc-muted">На этот день событий нет.</p>}
        </div>

        {!readonly && (
          <div className="mt-3 flex flex-col gap-2 border-t border-vsc-line pt-3">
            <div className="flex gap-2">
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="00:00"
                className="w-20 rounded border border-vsc-line bg-vsc-bg px-2 py-1.5 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
              />
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="Событие…"
                className="flex-1 rounded border border-vsc-line bg-vsc-bg px-2 py-1.5 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
              />
              <PriorityPicker value={form.priority} onChange={(p) => setForm({ ...form, priority: p })} />
              <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
              <button onClick={addEvent} className="flex items-center gap-1 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90">
                <Plus size={14} />
              </button>
            </div>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
              placeholder="Заметка к событию (необязательно)"
              className="w-full rounded border border-vsc-line bg-vsc-bg px-2 py-1.5 text-[12px] text-vsc-text outline-none focus:border-vsc-accent"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Owner-only button that triggers the reminder cron on demand — lets you verify
 * Telegram/email delivery without waiting for the scheduler. Uses the owner
 * session for auth (no secret needed from the browser).
 */
function ReminderCheck() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function check() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch("/api/workspace/cron", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "ошибка");
      setState("done");
      setMsg(j.sent > 0 ? `Отправлено: ${j.sent}` : "Нет событий к напоминанию");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "ошибка");
    }
    setTimeout(() => setState("idle"), 4000);
  }

  return (
    <button
      onClick={check}
      disabled={state === "running"}
      title="Проверить напоминания сейчас (Telegram + почта)"
      className="mr-1 flex items-center gap-1 rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-60"
    >
      <Bell size={13} />
      {state === "idle" ? "Напоминания" : state === "running" ? "Проверяю…" : msg}
    </button>
  );
}

function EventRow({
  ev,
  onPatch,
  onRemove,
  readonly,
}: {
  ev: WsEvent;
  onPatch: (e: WsEvent, body: Partial<WsEvent>) => void;
  onRemove: (id: string) => void;
  readonly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ev.title);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== ev.title) onPatch(ev, { title: v });
    else setDraft(ev.title);
  }

  return (
    <div
      className="group flex items-center gap-2 rounded border-l-2 px-2 py-1.5 hover:bg-vsc-hover"
      style={{ borderLeftColor: chipColor(ev) }}
    >
      <span className="w-12 shrink-0 font-mono text-[12px] text-vsc-yellow">{ev.time ?? "—"}</span>
      <PriorityDot priority={ev.priority} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(ev.title);
                setEditing(false);
              }
            }}
            className="w-full rounded border border-vsc-accent bg-vsc-bg px-1.5 py-0.5 text-[13px] text-vsc-text outline-none"
          />
        ) : (
          <div
            onDoubleClick={() => !readonly && setEditing(true)}
            className={`truncate text-[13px] text-vsc-text ${readonly ? "" : "cursor-text"}`}
          >
            {ev.title}
          </div>
        )}
        {ev.note && !editing && <div className="truncate text-[11px] text-vsc-muted">{ev.note}</div>}
      </div>

      {!readonly && (
        <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
          <PriorityPicker value={ev.priority} onChange={(p) => onPatch(ev, { priority: p })} size={14} />
          <ColorPicker value={ev.color} onChange={(c) => onPatch(ev, { color: c })} size={14} />
          <button onClick={() => onRemove(ev.id)} className="rounded p-1 text-vsc-muted hover:bg-vsc-active-row hover:text-red-400" title="Удалить">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
