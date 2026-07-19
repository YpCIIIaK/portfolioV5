import { z } from "zod";

/**
 * «Второй мозг» — граф знаний, который ИИ собирает из всего подключённого
 * контекста (задачи, заметки, календарь, почта, Telegram, Notion, …).
 * Здесь — серверная схема данных графа и промпт генерации. Снапшоты графа
 * лежат в ws_brain (CRUD через общий /api/workspace/[kind]).
 */

export const BRAIN_CATEGORIES = ["work", "project", "idea", "people", "finance", "learn", "life", "other"] as const;

const brainSource = z.object({
  panel: z.string().max(40).default("other"), // tasks | notes | calendar | mail | telegram | notion | bitrix | projects | subscriptions | news | other
  ref: z.string().max(300).default(""),       // человекочитаемая ссылка на источник: заголовок задачи/письма/страницы
  url: z.string().max(1000).nullable().optional(),
});

const brainNode = z.object({
  id: z.string().max(64),
  label: z.string().max(200),
  category: z.enum(BRAIN_CATEGORIES).catch("other"),
  importance: z.number().min(1).max(5).catch(3),
  summary: z.string().max(1000).default(""),
  source: brainSource.nullable().default(null),
  x: z.number().optional(),
  y: z.number().optional(),
}).passthrough();

const brainEdge = z.object({
  id: z.string().max(64),
  from: z.string().max(64),
  to: z.string().max(64),
  label: z.string().max(200).optional(),
}).passthrough();

export const brainData = z.object({
  nodes: z.array(brainNode).max(300).default([]),
  edges: z.array(brainEdge).max(600).default([]),
});

export type BrainData = z.infer<typeof brainData>;

/** Строгий промпт: модель должна вернуть ТОЛЬКО JSON графа. */
export function buildBrainPrompt(context: string): string {
  return [
    "Ты строишь «второй мозг» — граф знаний по личному рабочему пространству.",
    "Ниже полный снимок данных пользователя. Выдели сущности (проекты, задачи, люди, идеи, финансы, события, темы) как узлы и осмысленные связи между ними как рёбра.",
    "",
    "Требования:",
    "- 12–40 узлов. Каждый узел: короткий label, категория из списка work|project|idea|people|finance|learn|life|other, importance 1–5 (5 = критично), summary в 1–2 предложения, source — откуда взято.",
    "- source.panel — одна из: tasks, notes, calendar, mail, telegram, notion, bitrix, projects, subscriptions, news, other; source.ref — заголовок/название исходной записи.",
    "- Рёбра соединяют реально связанные вещи (проект ↔ его задачи, человек ↔ переписка, подписка ↔ инструмент). Не оставляй изолированных узлов, если связь очевидна. label ребра — краткая суть связи.",
    "- id — короткие slug-строки латиницей (n1, n2 … или осмысленные).",
    "",
    "Ответь ТОЛЬКО валидным JSON без пояснений и markdown-ограждений, вида:",
    '{"nodes":[{"id":"n1","label":"…","category":"project","importance":4,"summary":"…","source":{"panel":"tasks","ref":"…"}}],"edges":[{"id":"e1","from":"n1","to":"n2","label":"…"}]}',
    "",
    "ДАННЫЕ:",
    context || "(источники пусты — построй минимальный граф из того, что есть)",
  ].join("\n");
}

/** Достаём JSON из ответа модели (терпим к ```json-ограждениям и болтовне вокруг). */
export function parseBrainAnswer(raw: string): BrainData {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("модель не вернула JSON");
  text = text.slice(start, end + 1);
  const parsed = brainData.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("модель вернула JSON неожиданной формы");
  // Выкидываем рёбра, ссылающиеся на несуществующие узлы.
  const ids = new Set(parsed.data.nodes.map((n) => n.id));
  return {
    nodes: parsed.data.nodes,
    edges: parsed.data.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to),
  };
}
