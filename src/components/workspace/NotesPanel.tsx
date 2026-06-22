"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { DEMO_NOTES, wsCreate, wsUpdate, wsDelete, type Note } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";

export function NotesPanel() {
  const { items, setItems, loading, error, readonly, reload } = useCollection<Note>("notes", DEMO_NOTES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  const active = items.find((n) => n.id === activeId) ?? items[0] ?? null;

  // Sync the editor draft whenever the selected note changes.
  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
    if (active) {
      setDraft({ title: active.title, body: active.body });
      dirty.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  async function addNote() {
    const created = await wsCreate<Note>("notes", { title: "Новая заметка", body: "" });
    setItems([created, ...items]);
    setActiveId(created.id);
  }

  async function save() {
    if (!active || readonly) return;
    setSaving(true);
    try {
      const updated = await wsUpdate<Note>("notes", active.id, draft);
      setItems(items.map((n) => (n.id === active.id ? updated : n)));
      dirty.current = false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await wsDelete("notes", id);
    setItems(items.filter((n) => n.id !== id));
    setActiveId(null);
  }

  if (loading) return <PanelMsg>Загрузка заметок…</PanelMsg>;

  return (
    <div className="mx-auto max-w-4xl px-8 py-4">
      {readonly && <GuestBanner what="заметки" />}
      {error && <PanelMsg>{error}</PanelMsg>}

      <div className="flex gap-4">
        {/* list */}
        <div className="w-56 shrink-0">
          {!readonly && (
            <button
              onClick={addNote}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90"
            >
              <Plus size={14} /> Новая
            </button>
          )}
          <div className="flex flex-col gap-1">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={`truncate rounded px-2 py-1.5 text-left text-[13px] ${
                  active?.id === n.id ? "bg-vsc-active-row text-vsc-bright" : "text-vsc-text hover:bg-vsc-hover"
                }`}
              >
                {n.title || "Без названия"}
              </button>
            ))}
            {items.length === 0 && <p className="px-2 text-[12px] text-vsc-muted">Пока пусто.</p>}
          </div>
        </div>

        {/* editor */}
        <div className="min-w-0 flex-1">
          {active ? (
            <div className="flex flex-col gap-2">
              <input
                value={draft.title}
                disabled={readonly}
                onChange={(e) => {
                  dirty.current = true;
                  setDraft({ ...draft, title: e.target.value });
                }}
                placeholder="Заголовок"
                className="w-full rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[15px] font-medium text-vsc-bright outline-none focus:border-vsc-accent disabled:opacity-70"
              />
              <textarea
                value={draft.body}
                disabled={readonly}
                onChange={(e) => {
                  dirty.current = true;
                  setDraft({ ...draft, body: e.target.value });
                }}
                placeholder="Текст заметки…"
                rows={16}
                className="w-full resize-y rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13.5px] leading-relaxed text-vsc-text outline-none focus:border-vsc-accent disabled:opacity-70"
              />
              {!readonly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Save size={14} /> {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                  <button
                    onClick={() => remove(active.id)}
                    className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[13px] text-vsc-muted hover:bg-vsc-hover hover:text-red-400"
                  >
                    <Trash2 size={14} /> Удалить
                  </button>
                  <button onClick={reload} className="ml-auto text-[12px] text-vsc-muted hover:text-vsc-text">
                    Обновить
                  </button>
                </div>
              )}
            </div>
          ) : (
            <PanelMsg>Выбери заметку слева{!readonly && " или создай новую"}.</PanelMsg>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelMsg({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-4 text-[13px] text-vsc-muted">{children}</p>;
}
