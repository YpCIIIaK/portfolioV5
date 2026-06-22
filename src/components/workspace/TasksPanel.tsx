"use client";

import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { DEMO_TASKS, wsCreate, wsUpdate, wsDelete, type Task } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";

export function TasksPanel() {
  const { items, setItems, loading, error, readonly } = useCollection<Task>("tasks", DEMO_TASKS);
  const [title, setTitle] = useState("");

  async function add() {
    const t = title.trim();
    if (!t || readonly) return;
    setTitle("");
    const created = await wsCreate<Task>("tasks", { title: t });
    setItems([created, ...items]);
  }

  async function toggle(task: Task) {
    if (readonly) return;
    setItems(items.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)));
    await wsUpdate<Task>("tasks", task.id, { done: !task.done });
  }

  async function remove(id: string) {
    setItems(items.filter((x) => x.id !== id));
    await wsDelete("tasks", id);
  }

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка задач…</p>;

  const open = items.filter((t) => !t.done);
  const done = items.filter((t) => t.done);

  return (
    <div className="mx-auto max-w-2xl px-8 py-4">
      {readonly && <GuestBanner what="задачи" />}
      {error && <p className="mb-3 text-[13px] text-vsc-muted">{error}</p>}

      {!readonly && (
        <div className="mb-4 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Новая задача…"
            className="flex-1 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13.5px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          <button onClick={add} className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90">
            <Plus size={14} /> Добавить
          </button>
        </div>
      )}

      <TaskList tasks={open} onToggle={toggle} onRemove={remove} readonly={readonly} />

      {done.length > 0 && (
        <>
          <div className="mb-2 mt-5 text-[11px] uppercase tracking-wide text-vsc-muted">Выполнено</div>
          <TaskList tasks={done} onToggle={toggle} onRemove={remove} readonly={readonly} />
        </>
      )}

      {items.length === 0 && <p className="text-[13px] text-vsc-muted">Задач пока нет.</p>}
    </div>
  );
}

function TaskList({
  tasks,
  onToggle,
  onRemove,
  readonly,
}: {
  tasks: Task[];
  onToggle: (t: Task) => void;
  onRemove: (id: string) => void;
  readonly: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {tasks.map((t) => (
        <div key={t.id} className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-vsc-hover">
          <button
            onClick={() => onToggle(t)}
            disabled={readonly}
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              t.done ? "border-vsc-green bg-vsc-green text-black" : "border-vsc-muted"
            } disabled:opacity-60`}
          >
            {t.done && <Check size={12} />}
          </button>
          <span className={`flex-1 text-[13.5px] ${t.done ? "text-vsc-muted line-through" : "text-vsc-text"}`}>
            {t.title}
          </span>
          {!readonly && (
            <button
              onClick={() => onRemove(t.id)}
              className="opacity-0 transition group-hover:opacity-100"
              title="Удалить"
            >
              <Trash2 size={14} className="text-vsc-muted hover:text-red-400" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
