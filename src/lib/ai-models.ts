/**
 * Выбор модели OpenRouter по задаче.
 *
 * Раньше модель была одна на всё — константа из OPENROUTER_MODEL. Но задачи
 * разные: мозгу нужен большой контекст и терпение, ассистенту в чате — скорость,
 * воркфлоу хватает дешёвой. Здесь хранится карта «задача → модель» с одним
 * значением по умолчанию, и каждая задача может либо взять общее, либо своё.
 *
 * Порядок разрешения: модель задачи → общая модель из настроек → OPENROUTER_MODEL
 * → зашитый дефолт. Настройки живут в ws_ai_models; если Supabase недоступен,
 * всё честно откатывается на env — фича не должна ронять генерацию.
 */

import { sbSelect, sbUpsert, supabaseConfigured } from "@/lib/supabase";

export const AI_TASKS = ["default", "assistant", "brain", "workflow", "brief"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_TASK_LABEL: Record<AiTask, string> = {
  default: "По умолчанию",
  assistant: "Ассистент и Telegram",
  brain: "Мозг (сборка и дополнение)",
  workflow: "Воркфлоу",
  brief: "Утренняя сводка",
};

export const AI_TASK_HINT: Record<AiTask, string> = {
  default: "Берётся везде, где для задачи не выбрана своя модель",
  assistant: "Чат, агент с инструментами, бот в Telegram",
  brain: "Нужен большой контекст: диск целиком плюс все источники",
  workflow: "Шаги воркфлоу — обычно хватает быстрой и дешёвой",
  brief: "Короткая сводка раз в день",
};

export const FALLBACK_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

/** Модель из env — общий дефолт, когда в настройках пусто. */
export function envModel(): string {
  return process.env.OPENROUTER_MODEL || FALLBACK_MODEL;
}

interface ModelRow {
  task: string;
  model: string;
}

/**
 * Кэш на процесс. Настройки меняются вручную и редко, а читаются на каждом
 * запросе к модели — ходить в базу каждый раз незачем. TTL короткий, чтобы
 * смена модели применялась без передеплоя.
 */
let cache: { at: number; map: Record<string, string> } | null = null;
const TTL_MS = 30_000;

export function invalidateModelCache(): void {
  cache = null;
}

async function loadMap(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  if (!supabaseConfigured()) return {};
  try {
    const rows = await sbSelect<ModelRow>("ws_ai_models", "select=task,model");
    const map: Record<string, string> = {};
    for (const r of rows) if (r.model?.trim()) map[r.task] = r.model.trim();
    cache = { at: Date.now(), map };
    return map;
  } catch {
    // Настройки недоступны — не повод отказывать в генерации, откатимся на env.
    return {};
  }
}

/** Какая модель поедет на этой задаче. */
export async function resolveModel(task: AiTask = "default"): Promise<string> {
  const map = await loadMap();
  return map[task] || map.default || envModel();
}

/** Текущая карта для панели настроек: только явно заданные значения. */
export async function getModelMap(): Promise<Record<string, string>> {
  return { ...(await loadMap()) };
}

/** Пустая строка = «использовать общую», такую запись просто стираем. */
export async function setModel(task: AiTask, model: string): Promise<void> {
  await sbUpsert("ws_ai_models", { task, model: model.trim() }, "task");
  invalidateModelCache();
}

export function isAiTask(value: unknown): value is AiTask {
  return (AI_TASKS as readonly string[]).includes(value as string);
}

/* ---- каталог моделей OpenRouter ---------------------------------------- */

export interface CatalogModel {
  id: string;
  name: string;
  /** Длина контекста — главный критерий выбора для мозга. */
  context: number;
  /** Цена за миллион токенов ввода, в долларах. 0 у бесплатных. */
  promptPrice: number;
  completionPrice: number;
  /** Умеет ли function calling — без этого ассистент останется без инструментов. */
  tools: boolean;
}

let catalog: { at: number; list: CatalogModel[] } | null = null;
const CATALOG_TTL_MS = 3_600_000;

/**
 * Список моделей с OpenRouter. Публичный эндпоинт, ключ не нужен, но кэшируем
 * на час: список меняется медленно, а весит под мегабайт.
 */
export async function fetchCatalog(): Promise<CatalogModel[]> {
  if (catalog && Date.now() - catalog.at < CATALOG_TTL_MS) return catalog.list;

  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter вернул ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      id: string;
      name?: string;
      context_length?: number;
      pricing?: { prompt?: string; completion?: string };
      supported_parameters?: string[];
    }[];
  };

  const list = (json.data ?? [])
    .map((m) => ({
      id: m.id,
      name: m.name || m.id,
      context: m.context_length ?? 0,
      // Цены приходят строками за один токен — переводим в доллары за миллион.
      promptPrice: Number(m.pricing?.prompt ?? 0) * 1_000_000,
      completionPrice: Number(m.pricing?.completion ?? 0) * 1_000_000,
      tools: (m.supported_parameters ?? []).includes("tools"),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  catalog = { at: Date.now(), list };
  return list;
}
