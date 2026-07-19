import { z } from "zod";
import { askAI } from "@/lib/ai";
import { mailConfigured, fetchInbox } from "@/lib/mail-server";
import { supabaseConfigured, sbSelect, sbInsert, sbUpdate } from "@/lib/supabase";
import { bitrixConfigured, fetchTasks } from "@/lib/bitrix";
import { telegramConfigured, fetchDialogs } from "@/lib/telegram";
import { notionConnected, notionStatus, searchNotion, pageContent, fetchNotionTasks } from "@/lib/notion";

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
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  // Свободная строка: базовые категории + модель может завести свою.
  category: z.string().max(30).catch("other").default("other"),
  // coerce: модель иногда шлёт importance строкой ("4").
  importance: z.coerce.number().catch(3).transform((n) => Math.min(5, Math.max(1, Math.round(n) || 3))),
  summary: z.string().max(1000).catch("").default(""),
  source: brainSource.nullable().catch(null).default(null),
  x: z.number().optional(),
  y: z.number().optional(),
}).passthrough();

const brainEdge = z.object({
  // id необязателен — модель часто его опускает; проставим сами после разбора.
  id: z.string().max(64).optional(),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  label: z.string().max(200).optional(),
}).passthrough();

export const brainData = z.object({
  nodes: z.array(brainNode).max(300).default([]),
  edges: z.array(brainEdge).max(600).default([]),
});

export type BrainData = z.infer<typeof brainData>;

/**
 * Максимально полный ЛИЧНЫЙ контекст для мозга — читаем всё, что подключено:
 * задачи (вкл. сделанные), календарь (прошлое и будущее), заметки целиком,
 * проекты, подписки, Bitrix, все диалоги Telegram, почту без фильтров и весь
 * доступный Notion (список страниц + содержимое свежих + задачи из базы).
 * Новости / тренды GitHub / музыка сюда НЕ входят — это не личные данные.
 */
export async function collectBrainContext(): Promise<{ context: string; sources: string[] }> {
  const parts: string[] = [];
  const sources: string[] = [];
  const add = (title: string, body: string, src: string) => {
    if (body) { parts.push(`${title}:\n${body}`); sources.push(src); }
  };

  if (supabaseConfigured()) {
    try {
      const tasks = await sbSelect<{ title: string; due: string | null; priority: string; done: boolean }>(
        "ws_tasks", "select=title,due,priority,done&order=created_at.desc&limit=100",
      );
      add("ЗАДАЧИ (все, включая сделанные)", tasks.map((t) => `- ${t.done ? "[x]" : "[ ]"} ${t.title}${t.due ? ` (до ${t.due})` : ""}${t.priority !== "none" ? ` [${t.priority}]` : ""}`).join("\n"), `задачи (${tasks.length})`);
    } catch { /* skip */ }
    try {
      const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
      const events = await sbSelect<{ title: string; date: string; time: string | null; note: string | null }>(
        "ws_events", `select=title,date,time,note&date=gte.${from}&order=date.asc&limit=100`,
      );
      add("КАЛЕНДАРЬ (последние 60 дней и будущее)", events.map((e) => `- ${e.date}${e.time ? ` ${e.time}` : ""} — ${e.title}${e.note ? ` (${e.note.replace(/\s+/g, " ").slice(0, 80)})` : ""}`).join("\n"), `события (${events.length})`);
    } catch { /* skip */ }
    try {
      const notes = await sbSelect<{ title: string; body: string; priority: string }>(
        "ws_notes", "select=title,body,priority&order=updated_at.desc&limit=50",
      );
      add("ЗАМЕТКИ (полные)", notes.map((n) => `- ${n.title}${n.priority !== "none" ? ` [${n.priority}]` : ""}: ${n.body.replace(/\s+/g, " ").slice(0, 600)}`).join("\n"), `заметки (${notes.length})`);
    } catch { /* skip */ }
    try {
      const projects = await sbSelect<{ title: string; description: string; tags: string; repo_url: string | null }>(
        "ws_projects", "select=title,description,tags,repo_url&order=created_at.desc&limit=30",
      );
      add("ПРОЕКТЫ", projects.map((p) => `- ${p.title}${p.tags ? ` (${p.tags})` : ""}: ${p.description.replace(/\s+/g, " ").slice(0, 300)}${p.repo_url ? ` — ${p.repo_url}` : ""}`).join("\n"), `проекты (${projects.length})`);
    } catch { /* skip */ }
    try {
      const subs = await sbSelect<{ name: string; price: number; currency: string; period: string; tier: string; next_date: string | null }>(
        "ws_subscriptions", "select=name,price,currency,period,tier,next_date&order=created_at.desc&limit=30",
      );
      add("ПОДПИСКИ", subs.map((s) => `- ${s.name}${s.tier ? ` (${s.tier})` : ""}: ${s.price}${s.currency}/${s.period}${s.next_date ? `, списание ${s.next_date}` : ""}`).join("\n"), `подписки (${subs.length})`);
    } catch { /* skip */ }
  }

  if (bitrixConfigured()) {
    try {
      const bx = await fetchTasks(50);
      add("BITRIX ЗАДАЧИ", bx.map((t) => `- ${t.title} (${t.status}${t.deadline ? `, до ${t.deadline}` : ""})`).join("\n"), `Bitrix (${bx.length})`);
    } catch { /* skip */ }
  }

  if (telegramConfigured()) {
    try {
      const dialogs = await fetchDialogs(60);
      add("TELEGRAM (все недавние диалоги)", dialogs.map((d) => `- ${d.unread ? "● " : ""}${d.title}: ${d.lastMessage.replace(/\s+/g, " ").slice(0, 120)}`).join("\n"), `Telegram (${dialogs.length})`);
    } catch { /* skip */ }
  }

  if (mailConfigured()) {
    try {
      const mail = await fetchInbox(120);
      const recent = mail.slice(0, 80);
      add("ПОЧТА (последние письма, включая прочитанные)", recent.map((m) => `- ${m.unread ? "● " : ""}${m.from}: ${m.subject}`).join("\n"), `почта (${recent.length})`);
    } catch { /* skip */ }
  }

  try {
    if (await notionConnected()) {
      const pages = await searchNotion("", 50);
      add("NOTION (все доступные страницы)", pages.map((p) => `- ${p.title}${p.type === "database" ? " [база]" : ""}`).join("\n"), `Notion-страницы (${pages.length})`);
      // Содержимое свежих страниц — чтобы мозг знал, о чём они, а не только названия.
      const toRead = pages.filter((p) => p.type !== "database").slice(0, 10);
      const contents: string[] = [];
      for (const p of toRead) {
        try {
          const c = await pageContent(p.id, 60);
          const text = c.markdown.replace(/\s+/g, " ").slice(0, 600);
          if (text) contents.push(`### ${c.title}\n${text}`);
        } catch { /* skip page */ }
      }
      add("NOTION (содержимое свежих страниц)", contents.join("\n\n"), `Notion-контент (${contents.length})`);
      const status = await notionStatus();
      if (status.config.tasksDbId) {
        try {
          const tasks = await fetchNotionTasks(status.config, 50);
          add("NOTION ЗАДАЧИ", tasks.map((t) => `- ${t.done ? "[x]" : "[ ]"} ${t.title}${t.due ? ` (до ${t.due})` : ""}`).join("\n"), `Notion-задачи (${tasks.length})`);
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }

  return { context: parts.join("\n\n"), sources };
}

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
    "- РЁБРА ОБЯЗАТЕЛЬНЫ: примерно 1–2 ребра на узел (проект ↔ его задачи, человек ↔ переписка, подписка ↔ инструмент, тема ↔ заметка). Пустой массив edges — это ошибка. Не оставляй изолированных узлов. label ребра — краткая суть связи.",
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

  // Терпимо: разбираем поэлементно и выкидываем битые узлы/рёбра, а не весь ответ.
  const obj = json as { nodes?: unknown; edges?: unknown };
  const rawNodes = Array.isArray(obj?.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj?.edges) ? obj.edges : [];

  const nodes = rawNodes
    .map((n) => brainNode.safeParse(n))
    .flatMap((r) => (r.success ? [r.data] : []))
    .slice(0, 300);
  if (!nodes.length && rawNodes.length) throw new Error("модель вернула узлы без обязательных полей (id/label)");

  const ids = new Set(nodes.map((n) => n.id));
  if (knownIds) for (const id of knownIds) ids.add(id);

  let auto = 0;
  const edges = rawEdges
    .map((e) => brainEdge.safeParse(e))
    .flatMap((r) => (r.success ? [r.data] : []))
    .filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
    .map((e) => ({ ...e, id: e.id || `e${++auto}` }))
    .slice(0, 600);

  return { nodes, edges };
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

/** Промпт «только рёбра»: если модель вернула граф без связей — досвязываем вторым запросом. */
export function buildEdgesPrompt(shortcuts: string): string {
  return [
    "Вот узлы графа знаний (id | label | категория). Придумай осмысленные связи между ними.",
    "Верни примерно 1–2 ребра на узел; изолированных узлов быть не должно, если связь логична.",
    "",
    "Ответь ТОЛЬКО валидным JSON без пояснений:",
    '{"edges":[{"id":"e1","from":"<id>","to":"<id>","label":"краткая суть связи"}]}',
    "",
    "УЗЛЫ:",
    shortcuts,
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

/* ---- высокоуровневые операции (роуты + инструменты ассистента) -------- */

export interface BrainSnapshotRow { id: string; title: string; data: BrainData; updated_at: string }

/** Последний снапшот мозга или null. */
export async function latestBrainSnapshot(): Promise<BrainSnapshotRow | null> {
  const rows = await sbSelect<BrainSnapshotRow>("ws_brain", "select=*&order=updated_at.desc&limit=1");
  return rows[0] ?? null;
}

/** Текстовый обзор последнего снапшота — для ассистента и краткой сводки. */
export async function brainOverview(topN = 15): Promise<string> {
  const snapshot = await latestBrainSnapshot();
  if (!snapshot || !snapshot.data.nodes.length) return "";
  const { nodes, edges } = snapshot.data;

  const byCategory = new Map<string, number>();
  for (const n of nodes) byCategory.set(n.category, (byCategory.get(n.category) ?? 0) + 1);
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }

  const top = [...nodes]
    .sort((a, b) => b.importance - a.importance || (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
    .slice(0, topN);

  return [
    `Снапшот «${snapshot.title}» (обновлён ${snapshot.updated_at.slice(0, 10)}): ${nodes.length} узлов, ${edges.length} связей.`,
    `Категории: ${[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(", ")}.`,
    "Ключевые узлы:",
    ...top.map((n) => `- ${n.label} [${n.category}, важность ${n.importance}, связей ${degree.get(n.id) ?? 0}]${n.summary ? `: ${n.summary}` : ""}`),
  ].join("\n");
}

/** Найти узлы мозга по запросу и вернуть их с соседями. */
export async function searchBrain(query: string, limit = 10): Promise<string> {
  const snapshot = await latestBrainSnapshot();
  if (!snapshot || !snapshot.data.nodes.length) return "Мозг ещё не собран.";
  const { nodes, edges } = snapshot.data;
  const q = query.trim().toLowerCase();
  const hits = nodes.filter(
    (n) => n.label.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.category.toLowerCase().includes(q),
  ).slice(0, limit);
  if (!hits.length) return `В мозге ничего не найдено по «${query}».`;

  const label = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  return hits
    .map((n) => {
      const links = edges
        .filter((e) => e.from === n.id || e.to === n.id)
        .map((e) => `${label(e.from === n.id ? e.to : e.from)}${e.label ? ` (${e.label})` : ""}`);
      return [
        `• ${n.label} [${n.category}, важность ${n.importance}]`,
        n.summary ? `  ${n.summary}` : "",
        n.source ? `  источник: ${n.source.panel}${n.source.ref ? ` — ${n.source.ref}` : ""}` : "",
        links.length ? `  связан с: ${links.join("; ")}` : "  (связей нет)",
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

/** Полная генерация графа из всех источников (без сохранения). */
export async function generateBrainData(): Promise<{ data: BrainData; sources: string[] }> {
  const { context, sources } = await collectBrainContext();
  const answer = await askAI(buildBrainPrompt(context), { temperature: 0.4, maxTokens: 6000 });
  let data = parseBrainAnswer(answer);
  if (!data.nodes.length) throw new Error("модель вернула пустой граф");

  // Модель поскупилась на связи — досвязываем отдельным коротким запросом.
  if (data.nodes.length >= 4 && data.edges.length < data.nodes.length / 2) {
    try {
      const extra = await askAI(buildEdgesPrompt(buildBrainShortcuts(data)), { temperature: 0.3, maxTokens: 2000 });
      const delta = parseBrainAnswer(extra, new Set(data.nodes.map((n) => n.id)));
      data = mergeBrainDelta(data, { nodes: [], edges: delta.edges }).data;
    } catch { /* граф без части связей лучше, чем ошибка */ }
  }
  return { data, sources };
}

/** Полный пересбор с сохранением НОВЫМ снапшотом (не трогая старые). */
export async function rebuildBrainSnapshot(titleSuffix = ""): Promise<{ title: string; nodes: number; edges: number }> {
  const { data } = await generateBrainData();
  const title = `Мозг ${new Date().toLocaleDateString("ru-RU")}${titleSuffix ? ` ${titleSuffix}` : ""}`;
  await sbInsert("ws_brain", { title, data });
  return { title, nodes: data.nodes.length, edges: data.edges.length };
}

export interface AugmentResult {
  skipped?: string;
  id?: string;
  title?: string;
  added: number;
  edges: number;
  labels: string[];
  data?: BrainData;
}

/** Инкремент: дополнить последний снапшот только новым из источников. */
export async function augmentLatestBrain(): Promise<AugmentResult> {
  const snapshot = await latestBrainSnapshot();
  if (!snapshot || !snapshot.data.nodes.length) {
    return { skipped: "нет снапшота — сначала собери мозг полностью", added: 0, edges: 0, labels: [] };
  }
  const { context } = await collectBrainContext();
  const answer = await askAI(buildBrainAugmentPrompt(buildBrainShortcuts(snapshot.data), context), { temperature: 0.3, maxTokens: 3000 });
  const delta = parseBrainAnswer(answer, new Set(snapshot.data.nodes.map((n) => n.id)));
  const { data, addedNodes, addedEdges, labels } = mergeBrainDelta(snapshot.data, delta);
  if (addedNodes || addedEdges) {
    await sbUpdate("ws_brain", `id=eq.${encodeURIComponent(snapshot.id)}`, { data, updated_at: new Date().toISOString() });
  }
  return { id: snapshot.id, title: snapshot.title, added: addedNodes, edges: addedEdges, labels, data };
}

/**
 * Детализация: углубить одну категорию (или тему) последнего снапшота —
 * модель видит её узлы С summary, остальной граф шорткатами, и добавляет
 * под-узлы с конкретикой из данных.
 */
export async function expandBrainCategory(category: string): Promise<AugmentResult> {
  const snapshot = await latestBrainSnapshot();
  if (!snapshot || !snapshot.data.nodes.length) {
    return { skipped: "нет снапшота — сначала собери мозг полностью", added: 0, edges: 0, labels: [] };
  }
  const cat = category.trim().toLowerCase();
  const targets = snapshot.data.nodes.filter(
    (n) => n.category.toLowerCase() === cat || n.label.toLowerCase().includes(cat),
  );
  if (!targets.length) {
    return { skipped: `в мозге нет узлов категории/темы «${category}»`, added: 0, edges: 0, labels: [] };
  }
  const { context } = await collectBrainContext();
  const prompt = [
    `Ты ДЕТАЛИЗИРУЕШЬ часть «второго мозга» — узлы категории/темы «${category}».`,
    "",
    "УЗЛЫ ДЛЯ ДЕТАЛИЗАЦИИ (id | label | summary):",
    targets.map((n) => `${n.id} | ${n.label} | ${n.summary}`).join("\n"),
    "",
    "ОСТАЛЬНОЙ ГРАФ (шорткаты id | label | категория):",
    buildBrainShortcuts(snapshot.data),
    "",
    "Добавь 3–15 НОВЫХ узлов-деталей: конкретные подзадачи, факты, люди, документы, суммы, даты из данных ниже, относящиеся к этим узлам. Свяжи каждый новый узел рёбрами с детализируемыми (и при необходимости между собой).",
    "Категории новых узлов — та же или уточнённая; id — новые slug (nd1, nd2…). НЕ дублируй существующее.",
    "",
    'Ответь ТОЛЬКО валидным JSON: {"nodes":[…],"edges":[…]}',
    "",
    "ДАННЫЕ:",
    context,
  ].join("\n");
  const answer = await askAI(prompt, { temperature: 0.3, maxTokens: 3000 });
  const delta = parseBrainAnswer(answer, new Set(snapshot.data.nodes.map((n) => n.id)));
  const { data, addedNodes, addedEdges, labels } = mergeBrainDelta(snapshot.data, delta);
  if (addedNodes || addedEdges) {
    await sbUpdate("ws_brain", `id=eq.${encodeURIComponent(snapshot.id)}`, { data, updated_at: new Date().toISOString() });
  }
  return { id: snapshot.id, title: snapshot.title, added: addedNodes, edges: addedEdges, labels, data };
}
