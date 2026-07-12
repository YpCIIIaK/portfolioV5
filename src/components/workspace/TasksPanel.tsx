"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  CalendarClock,
  List,
  Columns3,
  Circle,
  CircleDot,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  DEMO_TASKS,
  wsCreate,
  wsUpdate,
  wsDelete,
  normalizeTask,
  type Task,
  type TaskStatus,
  type Priority,
} from "@/lib/workspace";
import { useCollection } from "./useCollection";
import { GuestBanner } from "./GuestBanner";
import { PriorityPicker, ColorPicker, PriorityDot, accentStyle, colorHex, priorityRank } from "./wsStyle";

/* ---------------------------------------------------------------- */
/*  shared helpers                                                   */
/* ---------------------------------------------------------------- */

/** Ranked by priority then due date (kanban columns and the list view). */
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

interface ColumnMeta {
  key: TaskStatus;
  label: string;
  color: string;
  Icon: LucideIcon;
}

const COLUMNS: ColumnMeta[] = [
  { key: "todo", label: "К выполнению", color: "#8b8b8b", Icon: Circle },
  { key: "doing", label: "В работе", color: "#fbbf24", Icon: CircleDot },
  { key: "done", label: "Готово", color: "#4ade80", Icon: CircleCheck },
];

const VIEW_KEY = "ws-tasks-view";
type View = "list" | "board";

function loadView(): View {
  if (typeof window === "undefined") return "board";
  return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
}

/* ---------------------------------------------------------------- */
/*  panel                                                            */
/* ---------------------------------------------------------------- */

export function TasksPanel() {
  const { items: raw, setItems, loading, error, readonly } = useCollection<Task>("tasks", DEMO_TASKS);
  const items = useMemo(() => raw.map(normalizeTask), [raw]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [view, setViewState] = useState<View>(loadView);

  function setView(v: View) {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  }

  async function add() {
    const t = title.trim();
    if (!t || readonly) return;
    setTitle("");
    const p = priority;
    setPriority("none");
    const created = await wsCreate<Task>("tasks", { title: t, priority: p, status: "todo", done: false });
    setItems([normalizeTask(created), ...items]);
  }

  async function patch(task: Task, body: Partial<Task>) {
    if (readonly) return;
    setItems(items.map((x) => (x.id === task.id ? normalizeTask({ ...x, ...body }) : x)));
    await wsUpdate<Task>("tasks", task.id, body as Record<string, unknown>);
  }

  async function remove(id: string) {
    setItems(items.filter((x) => x.id !== id));
    await wsDelete("tasks", id);
  }

  /** Move a card to another kanban column, keeping `done` in sync. */
  function moveTo(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    patch(task, { status, done: status === "done" });
  }

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка задач…</p>;

  return (
    <div className={`mx-auto px-8 py-4 ${view === "board" ? "max-w-5xl" : "max-w-2xl"}`}>
      {readonly && <GuestBanner what="задачи" />}
      {error && <p className="mb-3 text-[13px] text-vsc-muted">{error}</p>}

      <div className="mb-4 flex items-center gap-2">
        {!readonly && (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Новая задача… (/task high … — в ассистенте)"
              className="flex-1 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13.5px] text-vsc-text outline-none focus:border-vsc-accent"
            />
            <PriorityPicker value={priority} onChange={setPriority} />
            <button onClick={add} className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90">
              <Plus size={14} /> Добавить
            </button>
          </>
        )}
        <div className={`flex overflow-hidden rounded border border-vsc-line ${readonly ? "ml-auto" : ""}`}>
          <ViewButton active={view === "board"} onClick={() => setView("board")} Icon={Columns3} label="Доска" />
          <ViewButton active={view === "list"} onClick={() => setView("list")} Icon={List} label="Список" />
        </div>
      </div>

      {view === "board" ? (
        <Board tasks={items} onMove={moveTo} onPatch={patch} onRemove={remove} readonly={readonly} />
      ) : (
        <ListView tasks={items} onPatch={patch} onRemove={remove} readonly={readonly} />
      )}

      {items.length === 0 && <p className="mt-3 text-[13px] text-vsc-muted">Задач пока нет.</p>}
    </div>
  );
}

function ViewButton({ active, onClick, Icon, label }: { active: boolean; onClick: () => void; Icon: LucideIcon; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-2 text-[12px] transition-colors ${
        active ? "bg-vsc-accent text-white" : "text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

/* ---------------------------------------------------------------- */
/*  kanban board                                                     */
/* ---------------------------------------------------------------- */

function Board({
  tasks,
  onMove,
  onPatch,
  onRemove,
  readonly,
}: {
  tasks: Task[];
  onMove: (t: Task, s: TaskStatus) => void;
  onPatch: (t: Task, body: Partial<Task>) => void;
  onRemove: (id: string) => void;
  readonly: boolean;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  const byCol = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    for (const key of Object.keys(map) as TaskStatus[]) map[key].sort(sortTasks);
    return map;
  }, [tasks]);

  function drop(e: React.DragEvent, col: TaskStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    const task = tasks.find((t) => t.id === id);
    if (task) onMove(task, col);
    setDraggingId(null);
    setOverCol(null);
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = byCol[col.key];
        const isOver = overCol === col.key && draggingId !== null;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              if (readonly) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overCol !== col.key) setOverCol(col.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
            }}
            onDrop={(e) => !readonly && drop(e, col.key)}
            className={`flex min-h-64 flex-col rounded-lg border bg-vsc-sidebar/60 transition-colors ${
              isOver ? "border-vsc-accent bg-vsc-accent/10" : "border-vsc-line"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-vsc-line px-3 py-2">
              <col.Icon size={14} style={{ color: col.color }} />
              <span className="text-[12px] font-semibold uppercase tracking-wide text-vsc-text">{col.label}</span>
              <span className="ml-auto rounded-full bg-vsc-hover px-2 py-0.5 text-[11px] text-vsc-muted">{list.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {list.map((t) => (
                <Card
                  key={t.id}
                  task={t}
                  dragging={draggingId === t.id}
                  readonly={readonly}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", t.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(t.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverCol(null);
                  }}
                  onMove={(s) => onMove(t, s)}
                  onPatch={(body) => onPatch(t, body)}
                  onRemove={() => onRemove(t.id)}
                />
              ))}
              {list.length === 0 && (
                <div
                  className={`flex flex-1 items-center justify-center rounded border border-dashed text-[12px] ${
                    isOver ? "border-vsc-accent text-vsc-accent" : "border-vsc-line text-vsc-muted/70"
                  }`}
                >
                  {isOver ? "Отпусти сюда" : "Пусто"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({
  task: t,
  dragging,
  readonly,
  onDragStart,
  onDragEnd,
  onMove,
  onPatch,
  onRemove,
}: {
  task: Task;
  dragging: boolean;
  readonly: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (s: TaskStatus) => void;
  onPatch: (body: Partial<Task>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.title);
  const due = dueMeta(t.due);
  const colIdx = COLUMNS.findIndex((c) => c.key === t.status);
  const accent = colorHex(t.color);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== t.title) onPatch({ title: v });
    else setDraft(t.title);
  }

  return (
    <div
      draggable={!readonly && !editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group rounded-md border border-vsc-line bg-vsc-bg p-2.5 shadow-sm transition ${
        dragging ? "rotate-1 opacity-40" : ""
      } ${readonly ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
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
          className="w-full rounded border border-vsc-accent bg-vsc-bg px-1.5 py-0.5 text-[13px] text-vsc-text outline-none"
        />
      ) : (
        <div
          onDoubleClick={() => !readonly && setEditing(true)}
          className={`text-[13px] leading-snug ${t.status === "done" ? "text-vsc-muted line-through" : "text-vsc-text"}`}
        >
          {t.title}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <PriorityDot priority={t.priority} />
        {due && (
          <span
            className={`flex items-center gap-1 text-[11px] ${due.overdue && t.status !== "done" ? "text-red-400" : "text-vsc-muted"}`}
          >
            <CalendarClock size={11} /> {due.label}
          </span>
        )}

        {!readonly && (
          <div className="ml-auto flex items-center opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <button
              onClick={() => colIdx > 0 && onMove(COLUMNS[colIdx - 1].key)}
              disabled={colIdx === 0}
              title={colIdx > 0 ? `В «${COLUMNS[colIdx - 1].label}»` : undefined}
              className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:invisible"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => colIdx < COLUMNS.length - 1 && onMove(COLUMNS[colIdx + 1].key)}
              disabled={colIdx === COLUMNS.length - 1}
              title={colIdx < COLUMNS.length - 1 ? `В «${COLUMNS[colIdx + 1].label}»` : undefined}
              className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:invisible"
            >
              <ChevronRight size={13} />
            </button>
            <label className="relative flex cursor-pointer items-center rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text" title="Дедлайн">
              <CalendarClock size={13} />
              <input
                type="date"
                value={t.due ?? ""}
                onChange={(e) => onPatch({ due: e.target.value || null })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <PriorityPicker value={t.priority} onChange={(p) => onPatch({ priority: p })} size={13} />
            <ColorPicker value={t.color} onChange={(c) => onPatch({ color: c })} size={13} />
            <button onClick={onRemove} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-red-400" title="Удалить">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  list view (the original look)                                    */
/* ---------------------------------------------------------------- */

function ListView({
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
  const open = tasks.filter((t) => t.status !== "done").sort(sortTasks);
  const done = tasks.filter((t) => t.status === "done").sort(sortTasks);

  return (
    <>
      <div className="flex flex-col gap-1">
        {open.map((t) => (
          <TaskRow key={t.id} task={t} onPatch={onPatch} onRemove={onRemove} readonly={readonly} />
        ))}
      </div>
      {done.length > 0 && (
        <>
          <div className="mb-2 mt-5 text-[11px] uppercase tracking-wide text-vsc-muted">Выполнено · {done.length}</div>
          <div className="flex flex-col gap-1">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} onPatch={onPatch} onRemove={onRemove} readonly={readonly} />
            ))}
          </div>
        </>
      )}
    </>
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
        onClick={() => onPatch(t, { done: !t.done, status: t.done ? "todo" : "done" })}
        disabled={readonly}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          t.done ? "border-vsc-green bg-vsc-green text-black" : "border-vsc-muted"
        } disabled:opacity-60`}
      >
        {t.done && <Check size={12} />}
      </button>

      <PriorityDot priority={t.priority} />
      {t.status === "doing" && (
        <span className="shrink-0 rounded bg-[#fbbf24]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#fbbf24]">в работе</span>
      )}

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
