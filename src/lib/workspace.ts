"use client";

/** Shared types, demo data and a tiny fetch helper for the personal workspace. */

export interface Note {
  id: string;
  title: string;
  body: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  due: string | null;
  created_at: string;
}

export interface WsEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  note: string | null;
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

export type Kind = "notes" | "tasks" | "events" | "projects";

/** Read-only sample data shown to guests so the feature is explorable. */
export const DEMO_NOTES: Note[] = [
  {
    id: "demo-1",
    title: "Идеи для портфолио",
    body: "— добавить тёмную/светлую тему\n— живой график активности GitHub\n— секцию с AI-проектами\n\n(Это демо. Войди через GitHub, чтобы вести свои заметки.)",
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Прочитать",
    body: "Документация Next 16, паттерны realtime на WebSocket, заметки по Go-конкурентности.",
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const DEMO_TASKS: Task[] = [
  { id: "demo-1", title: "Запушить новый проект на GitHub", done: false, due: null, created_at: new Date().toISOString() },
  { id: "demo-2", title: "Обновить резюме", done: true, due: null, created_at: new Date().toISOString() },
  { id: "demo-3", title: "Ответить на письма рекрутеров", done: false, due: null, created_at: new Date().toISOString() },
];

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const DEMO_EVENTS: WsEvent[] = [
  { id: "demo-1", title: "Созвон по проекту", date: isoDay(0), time: "15:00", note: null },
  { id: "demo-2", title: "Дедлайн: тестовое", date: isoDay(2), time: null, note: "Отправить ссылку на репозиторий" },
  { id: "demo-3", title: "Спортзал", date: isoDay(1), time: "19:30", note: null },
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
