"use client";

import { useState } from "react";
import { Plus, Trash2, Check, CalendarClock } from "lucide-react";
import { DEMO_TASKS, wsCreate, wsUpdate, wsDelete, type Task, type Priority } from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";
import { PriorityPicker, ColorPicker, PriorityDot, accentStyle, priorityRank } from "./wsStyle";

/** Open tasks first, ranked by priority then due date; done tasks fall to bottom. */
function sortTasks(a: Task, b: Task): number {
  const pr = priorityRank(b.priority) - priorityRank(a.priority);
  if (pr !== 0) return pr;
  const ad = a.due ?? "9999";
  const bd = b.due ?? "9999";
  return ad.localeCompare(bd);
}

function dueMeta(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const overdue = diff < 0;
  const label =
    diff === 0 ? "сегодня" : diff === 1 ? "завтра" : diff === -1 ? "вчера" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return { label, overdue };
}

export function TasksPanel() {
  const { items, setItems, loading, error, readonly } = useCollection<Task>("tasks", DEMO_TASKS);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("none");

  async function add() {
    const t = title.trim();
    if (!t || readonly) return;
    setTitle("");
    const p = priority;
    setPriority("none");
    const created = await wsCreate<Task>("tasks", { title: t, priority: p });
    setItems([created, ...items]);
  }

  async function patch(task: Task, body: Partial<Task>) {
    if (readonly) return;
    setItems(items.map((x) => (x.id === task.id ? { ...x, ...body } : x)));
    await wsUpdate<Task>("tasks", task.id, body as Record<string, unknown>);
  }

  async function remove(id: string) {
    setItems(items.filter((x) => x.id !== id));
    await wsDelete("tasks", id);
  }

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка задач…</p>;

  const open = items.filter((t) => !t.done).sort(sortTasks);
  const done = items.filter((t) => t.done).sort(sortTasks);

  return (
    <div className="mx-auto max-w-2xl px-8 py-4">
      {readonly && <GuestBanner what="задачи" />}
      {error && <p className="mb-3 text-[13px] text-vsc-muted">{error}</p>}

      {!readonly && (
        <div className="mb-4 flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Новая задача…"
            className="flex-1 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13.5px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          <PriorityPicker value={priority} onChange={setPriority} />
          <button onClick={add} className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90">
            <Plus size={14} /> Добавить
          </button>
        </div>
      )}

      <TaskList tasks={open} onPatch={patch} onRemove={remove} readonly={readonly} />

      {done.length > 0 && (
        <>
          <div className="mb-2 mt-5 text-[11px] uppercase tracking-wide text-vsc-muted">Выполнено · {done.length}</div>
          <TaskList tasks={done} onPatch={patch} onRemove={remove} readonly={readonly} />
        </>
      )}

      {items.length === 0 && <p className="text-[13px] text-vsc-muted">Задач пока нет.</p>}
    </div>
  );
}

function TaskList({
  tasks,
  onPatch,
  onRemove,
  readonly,
}: {
  tasks: Task[];
  onPatch: (t: Task, body: Partial<Task>) => void;
  onRemove: (id: string) => void;
  readonly: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onPatch={onPatch} onRemove={onRemove} readonly={readonly} />
      ))}
    </div>
  );
}

function TaskRow({
  task: t,
  onPatch,
  onRemove,
  readonly,
}: {
  task: Task;
  onPatch: (t: Task, body: Partial<Task>) => void;
  onRemove: (id: string) => void;
  readonly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.title);
  const due = dueMeta(t.due);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== t.title) onPatch(t, { title: v });
    else setDraft(t.title);
  }

  return (
    <div
      className="group flex items-center gap-2 rounded border border-transparent px-2 py-1.5 hover:bg-vsc-hover"
      style={accentStyle(t.color)}
    >
      <button
        onClick={() => onPatch(t, { done: !t.done })}
        disabled={readonly}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          t.done ? "border-vsc-green bg-vsc-green text-black" : "border-vsc-muted"
        } disabled:opacity-60`}
      >
        {t.done && <Check size={12} />}
      </button>

      <PriorityDot priority={t.priority} />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(t.title);
              setEditing(false);
            }
          }}
          className="flex-1 rounded border border-vsc-accent bg-vsc-bg px-1.5 py-0.5 text-[13.5px] text-vsc-text outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => !readonly && setEditing(true)}
          className={`flex-1 truncate text-[13.5px] ${t.done ? "text-vsc-muted line-through" : "text-vsc-text"} ${
            readonly ? "" : "cursor-text"
          }`}
        >
          {t.title}
        </span>
      )}

      {due && (
        <span
          className={`flex shrink-0 items-center gap-1 text-[11px] ${
            due.overdue && !t.done ? "text-red-400" : "text-vsc-muted"
          }`}
        >
          <CalendarClock size={12} /> {due.label}
        </span>
      )}

      {!readonly && (
        <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
          <label className="relative flex cursor-pointer items-center rounded p-1 text-vsc-muted hover:bg-vsc-active-row hover:text-vsc-text" title="Дедлайн">
            <CalendarClock size={14} />
            <input
              type="date"
              value={t.due ?? ""}
              onChange={(e) => onPatch(t, { due: e.target.value || null })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <PriorityPicker value={t.priority} onChange={(p) => onPatch(t, { priority: p })} size={14} />
          <ColorPicker value={t.color} onChange={(c) => onPatch(t, { color: c })} size={14} />
          <button onClick={() => onRemove(t.id)} className="rounded p-1 text-vsc-muted hover:bg-vsc-active-row hover:text-red-400" title="Удалить">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
