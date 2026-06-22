"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { DEMO_EVENTS, wsCreate, wsDelete, type WsEvent } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarPanel() {
  const { items, setItems, loading, readonly } = useCollection<WsEvent>("events", DEMO_EVENTS);
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", time: "" });

  const byDay = useMemo(() => {
    const map = new Map<string, WsEvent[]>();
    for (const e of items) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
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
    setSelected(null);
  }

  async function addEvent() {
    if (!selected || readonly || !form.title.trim()) return;
    const created = await wsCreate<WsEvent>("events", {
      title: form.title.trim(),
      date: selected,
      time: form.time.trim() || null,
    });
    setItems([...items, created]);
    setForm({ title: "", time: "" });
  }

  async function remove(id: string) {
    setItems(items.filter((e) => e.id !== id));
    await wsDelete("events", id);
  }

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка календаря…</p>;

  const selectedEvents = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="mx-auto max-w-4xl px-8 py-4">
      {readonly && <GuestBanner what="календарь" />}

      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => shift(-1)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-[15px] font-medium text-vsc-bright">
          {MONTHS[m]} {y}
        </h2>
        <button onClick={() => shift(1)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WD.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] uppercase text-vsc-muted">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = dayKey(y, m, day);
          const evs = byDay.get(key) ?? [];
          const isToday = key === dayKey(today.getFullYear(), today.getMonth(), today.getDate());
          const isSel = key === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              className={`flex h-20 flex-col rounded border p-1 text-left transition ${
                isSel ? "border-vsc-accent" : "border-vsc-line hover:border-vsc-muted"
              } ${isToday ? "bg-vsc-active-row" : "bg-vsc-sidebar"}`}
            >
              <span className={`text-[12px] ${isToday ? "font-bold text-vsc-bright" : "text-vsc-text"}`}>{day}</span>
              <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
                {evs.slice(0, 2).map((e) => (
                  <span key={e.id} className="truncate rounded bg-vsc-accent/80 px-1 text-[10px] text-white">
                    {e.time ? `${e.time} ` : ""}{e.title}
                  </span>
                ))}
                {evs.length > 2 && <span className="text-[10px] text-vsc-muted">+{evs.length - 2}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 rounded border border-vsc-line bg-vsc-sidebar p-3">
          <div className="mb-2 text-[13px] font-medium text-vsc-bright">{selected}</div>
          <div className="flex flex-col gap-1">
            {selectedEvents.map((e) => (
              <div key={e.id} className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-vsc-hover">
                {e.time && <span className="text-[12px] text-vsc-yellow">{e.time}</span>}
                <span className="flex-1 text-[13px] text-vsc-text">{e.title}</span>
                {!readonly && (
                  <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 size={13} className="text-vsc-muted hover:text-red-400" />
                  </button>
                )}
              </div>
            ))}
            {selectedEvents.length === 0 && <p className="text-[12px] text-vsc-muted">Событий нет.</p>}
          </div>

          {!readonly && (
            <div className="mt-2 flex gap-2">
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
              <button onClick={addEvent} className="flex items-center gap-1 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90">
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
