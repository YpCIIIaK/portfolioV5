import { z } from "zod";

/**
 * «Второй мозг» — граф знаний, который ИИ собирает из всего подключённого
 * контекста (задачи, заметки, календарь, почта, Telegram, Notion, …).
 * Здесь — серверная схема данных графа и промпт генерации. Снапшоты графа
 * лежат в ws_brain (CRUD через общий /api/workspace/[kind]).
 */

/** Базовые категории — у них фиксированные цвета в UI. Модель может добавлять свои. */
export const BRAIN_CATEGORIES = ["work", "project", "idea", "people", "finance", "learn", "life", "other"] as const;

const brainSource = z.object({
  panel: z.string().max(40).default("other"), // tasks | notes | calendar | mail | telegram | notion | bitrix | projects | subscriptions | news | other
  ref: z.string().max(300).default(""),       // человекочитаемая ссылка на источник: заголовок задачи/письма/страницы
  url: z.string().max(1000).nullable().optional(),
});

const brainNode = z.object({
  id: z.string().max(64),
  label: z.string().max(200),
  // Свободная строка: базовые категории + модель может завести свою.
  category: z.string().max(30).catch("other").default("other"),
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
    "- 12–40 узлов. Каждый узел: короткий label, категория, importance 1–5 (5 = критично), summary в 1–2 предложения, source — откуда взято.",
    "- Категории: предпочитай базовые work|project|idea|people|finance|learn|life|other. Если сущность явно не влезает — придумай СВОЮ короткую категорию (одно слово латиницей, напр. health, travel) и используй её последовательно для похожих узлов.",
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

/**
 * Достаём JSON из ответа модели (терпим к ```json-ограждениям и болтовне вокруг).
 * `knownIds` — id уже существующих узлов: рёбра дельты могут ссылаться на них.
 */
export function parseBrainAnswer(raw: string, knownIds?: Set<string>): BrainData {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("модель не вернула JSON");
  text = text.slice(start, end + 1);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // Модель упёрлась в max_tokens и JSON обрезан — чиним: отсекаем до последнего
    // целого элемента массива и закрываем оставшиеся скобки.
    json = JSON.parse(repairTruncatedJson(text));
  }
  const parsed = brainData.safeParse(json);
  if (!parsed.success) throw new Error("модель вернула JSON неожиданной формы");
  // Выкидываем рёбра, ссылающиеся на несуществующие узлы.
  const ids = new Set(parsed.data.nodes.map((n) => n.id));
  if (knownIds) for (const id of knownIds) ids.add(id);
  return {
    nodes: parsed.data.nodes,
    edges: parsed.data.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to),
  };
}

/**
 * Чиним обрезанный JSON: сканируем со стеком скобок (учитывая строки и экранирование),
 * запоминаем последнюю позицию, где закрылся элемент массива, отсекаем там и
 * дозакрываем всё, что осталось открытым.
 */
function repairTruncatedJson(text: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let lastGood = -1;
  let lastGoodStack: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") {
      stack.pop();
      if (stack[stack.length - 1] === "[") {
        lastGood = i;
        lastGoodStack = [...stack];
      }
    }
  }
  if (lastGood === -1) throw new Error("модель вернула нечитаемый JSON");
  const closers = lastGoodStack.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
  return text.slice(0, lastGood + 1) + closers;
}

/* ---- инкрементальное дополнение («утренний тик») ---------------------- */

/**
 * Шорткаты существующего графа: id | label | категория — достаточно, чтобы
 * модель поняла, что уже есть и с чем связывать, но без полных summary
 * (экономим контекст: мозг может разрастись).
 */
export function buildBrainShortcuts(data: BrainData): string {
  return data.nodes.map((n) => `${n.id} | ${n.label} | ${n.category}`).join("\n");
}

/** Промпт дельты: вернуть ТОЛЬКО новые узлы и новые связи (в т.ч. к существующим id). */
export function buildBrainAugmentPrompt(shortcuts: string, context: string): string {
  return [
    "Ты ДОПОЛНЯЕШЬ существующий «второй мозг» — граф знаний по личному рабочему пространству.",
    "Ниже шорткаты уже существующих узлов (id | label | категория) и свежий снимок данных.",
    "",
    "Твоя задача: найти в данных ТОЛЬКО НОВОЕ — сущности, которых ещё нет среди шорткатов, — и связать их с существующими узлами.",
    "",
    "Требования:",
    "- Верни только новые узлы (0–12 штук). НЕ повторяй и НЕ пересказывай существующие: если сущность уже есть в шорткатах (даже под чуть другим названием) — не добавляй её.",
    "- Каждый новый узел: короткий label, категория, importance 1–5, summary в 1–2 предложения, source (panel: tasks|notes|calendar|mail|telegram|notion|bitrix|projects|subscriptions|news|other, ref: заголовок записи).",
    "- Категории: сперва используй те, что уже есть в шорткатах, затем базовые work|project|idea|people|finance|learn|life|other; если ничего не подходит — придумай свою (одно слово латиницей).",
    "- id новых узлов — новые slug-строки (nb1, nb2, …), не совпадающие с существующими id.",
    "- Рёбра соединяют новые узлы с существующими (используй их id из шорткатов) и между собой. Не оставляй новый узел без связей, если связь очевидна.",
    "- Если добавлять нечего — верни {\"nodes\":[],\"edges\":[]}.",
    "",
    "Ответь ТОЛЬКО валидным JSON без пояснений:",
    '{"nodes":[…],"edges":[{"id":"eb1","from":"nb1","to":"<существующий id>","label":"…"}]}',
    "",
    "СУЩЕСТВУЮЩИЕ УЗЛЫ (шорткаты):",
    shortcuts || "(граф пуст)",
    "",
    "СВЕЖИЕ ДАННЫЕ:",
    context || "(источники пусты)",
  ].join("\n");
}

/** Вмерживаем дельту: дедуп новых узлов по label, рёбра — по паре from/to. */
export function mergeBrainDelta(existing: BrainData, delta: BrainData): { data: BrainData; addedNodes: number; addedEdges: number; labels: string[] } {
  const norm = (s: string) => s.trim().toLowerCase();
  const byLabel = new Map(existing.nodes.map((n) => [norm(n.label), n.id]));
  const existingIds = new Set(existing.nodes.map((n) => n.id));

  // Дубликаты по названию не добавляем, но их рёбра переезжают на старый узел.
  const remap = new Map<string, string>();
  const freshNodes = delta.nodes.filter((n) => {
    const dup = byLabel.get(norm(n.label));
    if (dup) { remap.set(n.id, dup); return false; }
    if (existingIds.has(n.id)) { remap.set(n.id, n.id); return false; }
    return true;
  });

  const allIds = new Set([...existingIds, ...freshNodes.map((n) => n.id)]);
  const pair = (e: BrainEdgeLike) => [e.from, e.to].sort().join("→");
  const seen = new Set(existing.edges.map(pair));
  const freshEdges = delta.edges
    .map((e) => ({ ...e, from: remap.get(e.from) ?? e.from, to: remap.get(e.to) ?? e.to }))
    .filter((e) => e.from !== e.to && allIds.has(e.from) && allIds.has(e.to))
    .filter((e) => { const p = pair(e); if (seen.has(p)) return false; seen.add(p); return true; });

  return {
    data: { nodes: [...existing.nodes, ...freshNodes], edges: [...existing.edges, ...freshEdges] },
    addedNodes: freshNodes.length,
    addedEdges: freshEdges.length,
    labels: freshNodes.map((n) => n.label),
  };
}

interface BrainEdgeLike { from: string; to: string }
