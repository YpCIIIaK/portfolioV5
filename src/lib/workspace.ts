"use client";

/** Shared types, demo data and a tiny fetch helper for the personal workspace. */

/** Shared priority scale used by tasks, events and notes. */
export type Priority = "none" | "low" | "medium" | "high";

export interface Note {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  color: string; // palette key from wsStyle, "" = default
  updated_at: string;
}

/** Kanban column of a task. `done` is kept in sync for older consumers. */
export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  status: TaskStatus;
  due: string | null;
  priority: Priority;
  color: string;
  created_at: string;
}

/** Rows created before the kanban migration have no status — derive it. */
export function normalizeTask(t: Task): Task {
  const status: TaskStatus =
    t.status === "todo" || t.status === "doing" || t.status === "done"
      ? t.status
      : t.done
        ? "done"
        : "todo";
  return { ...t, status, done: status === "done" };
}

export interface WsEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  note: string | null;
  priority: Priority;
  color: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  repo_url: string | null;
  tags: string; // comma-separated
  is_public: boolean;
  created_at: string;
}

/** Billing cycle of a subscription. */
export type SubPeriod = "monthly" | "yearly";

export interface Subscription {
  id: string;
  name: string; // что: Netflix, Claude Pro, …
  price: number; // сколько за период
  currency: string; // символ: ₽ $ € ₸
  period: SubPeriod;
  tier: string; // тариф: Pro, Premium, Family (опционально)
  description: string; // заметка (опционально)
  next_date: string | null; // следующее списание YYYY-MM-DD (опционально)
  created_at: string;
}

export type Kind = "notes" | "tasks" | "events" | "projects" | "subscriptions";

/** Currency symbols offered in the subscriptions form. */
export const CURRENCIES = ["₽", "₸", "$", "€"];

/** Normalize a subscription's price to a per-month figure. */
export function monthlyCost(s: Subscription): number {
  return s.period === "yearly" ? s.price / 12 : s.price;
}

/** Read-only sample data shown to guests so the feature is explorable. */
export const DEMO_NOTES: Note[] = [
  {
    id: "demo-1",
    title: "Идеи для портфолио",
    body: "— добавить тёмную/светлую тему\n— живой график активности GitHub\n— секцию с AI-проектами\n\n(Это демо. Войди через GitHub, чтобы вести свои заметки.)",
    priority: "medium",
    color: "purple",
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Прочитать",
    body: "Документация Next 16, паттерны realtime на WebSocket, заметки по Go-конкурентности.",
    priority: "none",
    color: "",
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const DEMO_TASKS: Task[] = [
  { id: "demo-1", title: "Запушить новый проект на GitHub", done: false, status: "todo", due: isoDay(1), priority: "high", color: "", created_at: new Date().toISOString() },
  { id: "demo-2", title: "Обновить резюме", done: true, status: "done", due: null, priority: "low", color: "", created_at: new Date().toISOString() },
  { id: "demo-3", title: "Ответить на письма рекрутеров", done: false, status: "doing", due: isoDay(0), priority: "medium", color: "blue", created_at: new Date().toISOString() },
];

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const DEMO_EVENTS: WsEvent[] = [
  { id: "demo-1", title: "Созвон по проекту", date: isoDay(0), time: "15:00", note: null, priority: "medium", color: "blue" },
  { id: "demo-2", title: "Дедлайн: тестовое", date: isoDay(2), time: null, note: "Отправить ссылку на репозиторий", priority: "high", color: "" },
  { id: "demo-3", title: "Спортзал", date: isoDay(1), time: "19:30", note: null, priority: "none", color: "green" },
];

export const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-1",
    title: "Repo Anti-Rot",
    description: "Монитор «гниения» репозитория: 16 сканеров, score и грейд A–F, опциональный AI-проход. CLI + GitHub Action + дашборд.",
    repo_url: "https://github.com/YpCIIIaK/repo-janitor",
    tags: "TypeScript, Next.js, pnpm, Vitest",
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Hephaestus — Multi-Agent Arena",
    description: "Мульти-модельный чат и DAG-пайплайны агентов поверх OpenRouter + Ollama, RAG, оптимизация токенов.",
    repo_url: "https://github.com/YpCIIIaK/Hephaestus",
    tags: "TypeScript, Next.js, OpenRouter, Ollama, RAG",
    is_public: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  { id: "demo-1", name: "Claude Pro", price: 20, currency: "$", period: "monthly", tier: "Pro", description: "AI-ассистент для кода и текста", next_date: isoDay(12), created_at: new Date().toISOString() },
  { id: "demo-2", name: "Spotify", price: 169, currency: "₽", period: "monthly", tier: "Individual", description: "", next_date: isoDay(5), created_at: new Date().toISOString() },
  { id: "demo-3", name: "GitHub Copilot", price: 100, currency: "$", period: "yearly", tier: "", description: "Годовая подписка", next_date: isoDay(120), created_at: new Date().toISOString() },
];

interface ApiList<T> { items: T[] }
interface ApiOne<T> { item: T }

export async function wsList<T>(kind: Kind): Promise<T[]> {
  const res = await fetch(`/api/workspace/${kind}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as ApiList<T>).items;
}

export async function wsCreate<T>(kind: Kind, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/workspace/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as ApiOne<T>).item;
}

export async function wsUpdate<T>(kind: Kind, id: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/workspace/${kind}?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as ApiOne<T>).item;
}

export async function wsDelete(kind: Kind, id: string): Promise<void> {
  const res = await fetch(`/api/workspace/${kind}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(String(res.status));
}
