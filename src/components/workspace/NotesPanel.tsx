"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { DEMO_NOTES, wsCreate, wsUpdate, wsDelete, type Note } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";
import { PriorityPicker, ColorPicker, PriorityDot, colorHex } from "./wsStyle";

type SaveStatus = "idle" | "saving" | "saved";

export function NotesPanel() {
  const { items, setItems, loading, error, readonly } = useCollection<Note>("notes", DEMO_NOTES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Always-fresh snapshot for the debounced saver + per-note debounce timers.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selected = items.find((n) => n.id === selectedId) ?? null;

  // Auto-select the first note once data lands (state adjustment during render).
  if (!selectedId && items.length) setSelectedId(items[0].id);

  // Grow the body textarea to fit its content (Notion-style, no inner scrollbar).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [selected?.id, selected?.body]);

  function scheduleSave(id: string) {
    if (readonly) return;
    setStatus("saving");
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const n = itemsRef.current.find((x) => x.id === id);
      if (!n) return;
      try {
        await wsUpdate<Note>("notes", id, { title: n.title, body: n.body });
        setStatus("saved");
      } catch {
        setStatus("idle");
      }
    }, 600);
  }

  function edit(field: "title" | "body", value: string) {
    if (!selected) return;
    setItems(items.map((n) => (n.id === selected.id ? { ...n, [field]: value } : n)));
    scheduleSave(selected.id);
  }

  async function addNote() {
    const created = await wsCreate<Note>("notes", { title: "", body: "" });
    setItems([created, ...items]);
    setSelectedId(created.id);
    setStatus("idle");
  }

  async function patchMeta(id: string, body: Partial<Note>) {
    if (readonly) return;
    setItems(items.map((n) => (n.id === id ? { ...n, ...body } : n)));
    await wsUpdate<Note>("notes", id, body as Record<string, unknown>);
  }

  async function remove(id: string) {
    clearTimeout(timers.current[id]);
    const rest = items.filter((n) => n.id !== id);
    setItems(rest);
    setSelectedId(rest[0]?.id ?? null);
    await wsDelete("notes", id);
  }

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка заметок…</p>;

  return (
    <div className="mx-auto flex h-full max-w-7xl gap-0 px-4">
      {/* page list */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-vsc-line py-4 pr-2">
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Заметки</span>
          {!readonly && (
            <button onClick={addNote} title="Новая страница" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
              <Plus size={15} />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`group flex items-center gap-1.5 rounded border-l-2 px-2 py-1.5 text-left text-[13px] ${
                selectedId === n.id ? "bg-vsc-active-row text-vsc-bright" : "text-vsc-text hover:bg-vsc-hover"
              }`}
              style={{ borderLeftColor: colorHex(n.color) ?? "transparent" }}
            >
              <FileText size={13} className="shrink-0 text-vsc-muted" />
              <span className="flex-1 truncate">{n.title?.trim() || "Без названия"}</span>
              <PriorityDot priority={n.priority} />
              {!readonly && (
                <Trash2
                  size={13}
                  className="shrink-0 text-vsc-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n.id);
                  }}
                />
              )}
            </button>
          ))}
          {!readonly && (
            <button
              onClick={addNote}
              className="mt-1 flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-[13px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
            >
              <Plus size={13} /> Новая страница
            </button>
          )}
        </div>
      </aside>

      {/* document */}
      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-6">
          {readonly && <GuestBanner what="заметки" />}
          {error && <p className="mb-3 text-[13px] text-vsc-muted">{error}</p>}

          {selected ? (
            <>
              <div className="mb-2 flex h-6 items-center justify-end gap-1">
                {!readonly && (
                  <>
                    <span className="mr-1 text-[11px] text-vsc-muted">
                      {status === "saving" ? "Сохранение…" : status === "saved" ? "Сохранено" : ""}
                    </span>
                    <PriorityPicker value={selected.priority} onChange={(p) => patchMeta(selected.id, { priority: p })} />
                    <ColorPicker value={selected.color} onChange={(c) => patchMeta(selected.id, { color: c })} />
                  </>
                )}
              </div>
              <textarea
                value={selected.title}
                disabled={readonly}
                onChange={(e) => edit("title", e.target.value.replace(/\n/g, ""))}
                rows={1}
                placeholder="Без названия"
                className="w-full resize-none bg-transparent text-[28px] font-bold leading-tight text-vsc-bright outline-none placeholder:text-vsc-muted/50 disabled:opacity-80"
              />
              <textarea
                ref={bodyRef}
                value={selected.body}
                disabled={readonly}
                onChange={(e) => edit("body", e.target.value)}
                placeholder="Начни писать…"
                className="mt-3 min-h-[60vh] w-full resize-none bg-transparent text-[15px] leading-relaxed text-vsc-text outline-none placeholder:text-vsc-muted/50 disabled:opacity-80"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center text-vsc-muted">
              <FileText size={32} className="mb-3 opacity-40" />
              <p className="text-[13px]">{readonly ? "Нет заметок." : "Создай первую страницу."}</p>
              {!readonly && (
                <button onClick={addNote} className="mt-3 flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90">
                  <Plus size={14} /> Новая страница
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
