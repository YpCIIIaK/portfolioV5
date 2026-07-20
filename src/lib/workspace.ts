"use client";

/** Shared types, demo data and a tiny fetch helper for the personal workspace. */

import type { Workflow } from "@/lib/workflow-steps";

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

export type Kind = "notes" | "tasks" | "events" | "projects" | "subscriptions" | "diagrams" | "brain" | "workflows";

/* ---- Second brain: AI-собранный граф знаний -------------------------- */

/** Базовые категории имеют фиксированные цвета; ИИ может добавлять свои (любая строка). */
export type BrainCategory = string;

export interface BrainSource {
  panel: string; // tasks | notes | calendar | mail | telegram | notion | bitrix | projects | subscriptions | news | other
  ref: string;   // человекочитаемый указатель: заголовок задачи/письма/страницы
  url?: string | null;
}

export interface BrainNode {
  id: string;
  label: string;
  category: BrainCategory;
  importance: number; // 1..5
  summary: string;
  source: BrainSource | null;
  x?: number;
  y?: number;
}

export interface BrainEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface BrainState {
  nodes: BrainNode[];
  edges: BrainEdge[];
}

export interface BrainSnapshot {
  id: string;
  title: string;
  data: BrainState;
  updated_at: string;
  created_at: string;
}

/** Воркфлоу: типы и каталог блоков живут в workflow-steps (общие с сервером). */
export type { Workflow, WorkflowData, WorkflowStep, WorkflowRun, WorkflowVersion, StepResult } from "@/lib/workflow-steps";

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

/** Демо-граф «второго мозга» для гостей — показывает, как это выглядит. */
export const DEMO_BRAIN: BrainState = {
  nodes: [
    { id: "b1", label: "Портфолио-IDE", category: "project", importance: 5, summary: "Главный пет-проект: сайт-портфолио в виде VS Code с личным кабинетом.", source: { panel: "projects", ref: "portfolioV5" } },
    { id: "b2", label: "Repo Anti-Rot", category: "project", importance: 4, summary: "Монитор «гниения» репозиториев: 16 сканеров, score A–F.", source: { panel: "projects", ref: "Repo Anti-Rot" } },
    { id: "b3", label: "Запушить новый проект", category: "work", importance: 4, summary: "Открытая задача с дедлайном завтра.", source: { panel: "tasks", ref: "Запушить новый проект на GitHub" } },
    { id: "b4", label: "Рекрутеры", category: "people", importance: 4, summary: "Несколько писем от рекрутеров ждут ответа.", source: { panel: "mail", ref: "Ответить на письма рекрутеров" } },
    { id: "b5", label: "Резюме", category: "work", importance: 3, summary: "Обновить резюме под свежие проекты.", source: { panel: "tasks", ref: "Обновить резюме" } },
    { id: "b6", label: "Claude Pro", category: "finance", importance: 3, summary: "Подписка $20/мес — основной AI-инструмент.", source: { panel: "subscriptions", ref: "Claude Pro" } },
    { id: "b7", label: "AI-агенты", category: "learn", importance: 4, summary: "Изучение tool-calling, мульти-агентных пайплайнов и RAG.", source: { panel: "notes", ref: "Прочитать" } },
    { id: "b8", label: "Hephaestus", category: "project", importance: 3, summary: "Мульти-модельная арена агентов поверх OpenRouter.", source: { panel: "projects", ref: "Hephaestus" } },
    { id: "b9", label: "Созвон по проекту", category: "work", importance: 3, summary: "Сегодня в 15:00.", source: { panel: "calendar", ref: "Созвон по проекту" } },
    { id: "b10", label: "Спортзал", category: "life", importance: 2, summary: "Завтра 19:30 — держать режим.", source: { panel: "calendar", ref: "Спортзал" } },
    { id: "b11", label: "Идея: второй мозг", category: "idea", importance: 5, summary: "ИИ читает всё и строит живой граф знаний со связями. Ты смотришь на него прямо сейчас.", source: { panel: "notes", ref: "Идеи для портфолио" } },
  ],
  edges: [
    { id: "be1", from: "b1", to: "b3", label: "задача проекта" },
    { id: "be2", from: "b1", to: "b11", label: "фича" },
    { id: "be3", from: "b1", to: "b2", label: "встроен Repo Health" },
    { id: "be4", from: "b4", to: "b5", label: "нужно резюме" },
    { id: "be5", from: "b4", to: "b1", label: "показать портфолио" },
    { id: "be6", from: "b6", to: "b7", label: "инструмент обучения" },
    { id: "be7", from: "b7", to: "b8", label: "практика" },
    { id: "be8", from: "b7", to: "b11", label: "основа идеи" },
    { id: "be9", from: "b9", to: "b1", label: "обсуждение" },
    { id: "be10", from: "b8", to: "b1", label: "в портфолио" },
  ],
};

/** Демо-воркфлоу для гостей — показывает, из чего собирается цепочка. */
export const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: "demo-1",
    title: "Итог дня в Telegram",
    description: "Собирает короткую сводку по задачам и присылает её в личный чат.",
    enabled: true,
    data: {
      steps: [
        { id: "s1", type: "ai", params: { prompt: "Сформулируй итог дня в 3–5 пунктов по этим данным:\n{{input}}", system: "Ты — секретарь. Пиши сухо, без воды." } },
        { id: "s2", type: "telegram", params: { text: "Итог дня {{date}}:\n\n{{prev}}", format: "markdown" } },
      ],
    },
    versions: [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Идея → задача + письмо",
    description: "Превращает сырую мысль в задачу и дублирует её на почту.",
    enabled: true,
    data: {
      steps: [
        { id: "s1", type: "ai", params: { prompt: "Переформулируй в одну чёткую задачу с глаголом действия:\n{{input}}" } },
        { id: "s2", type: "task", params: { title: "{{prev}}", priority: "medium" } },
        { id: "s3", type: "email", params: { subject: "Новая задача от {{date}}", text: "{{step:s1}}" } },
      ],
    },
    versions: [],
    updated_at: new Date(Date.now() - 86400000).toISOString(),
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
