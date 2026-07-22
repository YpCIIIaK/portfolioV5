import type { BrainState, BrainNode, BrainEdge, BrainCategory } from "@/lib/workspace";

/**
 * Чистая логика графа «Второго мозга»: категории и цвета, вес узлов,
 * достройка центров категорий. Ни React, ни canvas — только данные,
 * поэтому модуль можно тестировать и переиспользовать как есть.
 */

/** Зеркало CleanPlan из brain.ts — сам brain.ts тянет Supabase и в клиент не импортируется. */
export interface CleanPlan {
  nodes: { id: string; label: string; reason: string }[];
  edges: number;
  keptNodes: number;
  keptEdges: number;
}

/** Базовые категории с фиксированными цветами; всё прочее ИИ добавляет сам. */
export const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "project", label: "Проекты", color: "#c586c0" },
  { key: "work", label: "Работа", color: "#4fc1ff" },
  { key: "idea", label: "Идеи", color: "#dcdcaa" },
  { key: "people", label: "Люди", color: "#4ec9b0" },
  { key: "finance", label: "Финансы", color: "#ce9178" },
  { key: "learn", label: "Обучение", color: "#9cdcfe" },
  { key: "life", label: "Жизнь", color: "#6a9955" },
  { key: "other", label: "Прочее", color: "#858585" },
];

/** Палитра для категорий, которых нет в базовом списке, — цвет стабилен по имени. */
const EXTRA_COLORS = ["#d16969", "#b5cea8", "#569cd6", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#e06c75"];

export function catColor(c: BrainCategory): string {
  const base = CATEGORIES.find((x) => x.key === c);
  if (base) return base.color;
  let h = 0;
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0;
  return EXTRA_COLORS[h % EXTRA_COLORS.length];
}

export const catLabel = (c: BrainCategory) => CATEGORIES.find((x) => x.key === c)?.label ?? c;

/* ---- вес узла --------------------------------------------------------- */

/**
 * Вес 0..1 — насколько узел «тяжёлый». Считается на лету из importance И
 * связности: узел, к которому сходится полграфа, весит больше одинокого с той
 * же важностью. Нормализация РАНГОВАЯ, а не по абсолютной шкале: если модель
 * наставила всем 4 (а она это любит), ранги всё равно разведут узлы по весу —
 * поэтому старые снапшоты чинятся без миграции данных.
 */
export function computeWeights(nodes: BrainNode[], edges: BrainEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  // Связность в log-шкале: 0→1 связь заметна, 8→9 уже почти нет.
  const score = nodes.map((n) => ({
    id: n.id,
    s: Math.max(1, Math.min(5, n.importance)) + Math.log1p(degree.get(n.id) ?? 0) * 1.7,
  }));

  const out = new Map<string, number>();
  if (!score.length) return out;
  const sorted = [...score].sort((a, b) => a.s - b.s);
  // Одинаковый score → одинаковый ранг, иначе узлы одной важности дрожали бы.
  const rankOf = new Map<number, number>();
  sorted.forEach((x, i) => { if (!rankOf.has(x.s)) rankOf.set(x.s, i); });
  const last = Math.max(1, sorted.length - 1);
  for (const x of score) {
    // Ранг в степени: линейный давал «тяжёлыми» верхнюю четверть графа — два
    // десятка узлов со свечением, то есть выделено всё и не выделено ничего.
    // ^2.2 оставляет наверху единицы, середина оседает в спокойный фон.
    const rank = Math.pow(rankOf.get(x.s)! / last, 2.2);
    // Смешиваем ранг с абсолютом: ранг даёт контраст даже в плоском графе,
    // абсолют не даёт «повысить» откровенный мусор в маленьком графе.
    out.set(x.id, rank * 0.65 + Math.min(1, (x.s - 1) / 6) * 0.35);
  }

  // Явные опоры: 2–3 верхних узла графа поднимаем до максимума независимо от
  // того, насколько плотно они сидят с соседями по рангу. Без этого «главный
  // проект» и «второй проект» отличались от рядового узла на пару процентов
  // веса — глазом неразличимо. Сколько именно опор — от размера графа, чтобы
  // в графе из десяти узлов не выделилась треть.
  const hubs = Math.min(3, Math.max(1, Math.round(nodes.length / 18)));
  const top = [...score].sort((a, b) => b.s - a.s).slice(0, hubs);
  top.forEach((x, i) => out.set(x.id, Math.max(out.get(x.id) ?? 0, 1 - i * 0.05)));

  return out;
}

/* ---- центры категорий ------------------------------------------------- */

/**
 * Узлы-центры категорий — чисто отображаемые, в снапшот не сохраняются.
 *
 * Модель заводит «финансы» как категорию, но узла, к которому эта категория
 * сходится, не создаёт: подписки, счета и траты висят отдельными точками, и
 * доля выглядит рассыпанной пылью. Здесь недостающий центр достраивается на
 * лету и к нему подтягивается то, что внутри категории ни с чем не связано, —
 * то есть ровно то, что «очевидно к нему идёт».
 *
 * Префикс отличает их от настоящих узлов: они не редактируются, не участвуют в
 * связывании и не попадают в сохраняемый граф.
 */
const HUB_PREFIX = "cat:";
export const isHubId = (id: string) => id.startsWith(HUB_PREFIX);

export function withCategoryHubs(g: BrainState): BrainState {
  const byCat = new Map<string, BrainNode[]>();
  for (const n of g.nodes) {
    const list = byCat.get(n.category) ?? [];
    list.push(n);
    byCat.set(n.category, list);
  }

  const nodes: BrainNode[] = [];
  const edges: BrainEdge[] = [];

  for (const [cat, members] of byCat) {
    // Меньше четырёх — это не «доля», центр только добавит шума.
    if (members.length < 4) continue;

    const ids = new Set(members.map((n) => n.id));
    // Связи ВНУТРИ категории: только они говорят, есть ли у доли своё ядро.
    const inDegree = new Map<string, number>();
    for (const e of g.edges) {
      if (ids.has(e.from) && ids.has(e.to)) {
        inDegree.set(e.from, (inDegree.get(e.from) ?? 0) + 1);
        inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
      }
    }
    // Естественный центр уже есть — свой узел лучше выдуманного, не мешаем.
    const natural = members.some((n) => (inDegree.get(n.id) ?? 0) >= members.length * 0.4);
    if (natural) continue;

    // Подтягиваем только сирот: у кого внутри категории нет ни одной связи.
    // Тянуть всех — значит нарисовать сплошную звезду поверх готовых связей.
    const orphans = members.filter((n) => !(inDegree.get(n.id) ?? 0));
    if (orphans.length < 3) continue;

    const hubId = `${HUB_PREFIX}${cat}`;
    nodes.push({
      id: hubId,
      label: catLabel(cat),
      category: cat,
      importance: 5,
      summary: "",
      source: { panel: "other", ref: "" },
    });
    for (const o of orphans) {
      edges.push({ id: `${hubId}:${o.id}`, from: hubId, to: o.id });
    }
  }

  if (!nodes.length) return g;
  return { nodes: [...g.nodes, ...nodes], edges: [...g.edges, ...edges] };
}

export const radius = (w: number) => 3.5 + w * 11;
/** Ниже этого веса узел — фон: гасим и прячем подпись, чтобы не забивал холст. */
export const NOISE = 0.28;

/** Внутренние вкладки-источники: panel → id файла в IDE. */
export const SOURCE_FILE: Record<string, string> = {
  tasks: "workspace/tasks.todo",
  notes: "workspace/notes.md",
  calendar: "workspace/calendar.tsx",
  mail: "workspace/mail.tsx",
  telegram: "workspace/telegram.tsx",
  notion: "workspace/notion.tsx",
  bitrix: "workspace/bitrix.tsx",
  drive: "workspace/drive.tsx",
  projects: "workspace/projects.tsx",
  subscriptions: "workspace/subscriptions.tsx",
  news: "workspace/news.tsx",
};
