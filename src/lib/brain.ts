import { z } from "zod";
import { askAI } from "@/lib/ai";
import { mailConfigured, fetchInbox } from "@/lib/mail-server";
import { supabaseConfigured, sbSelect, sbInsert, sbUpdate } from "@/lib/supabase";
import { bitrixConfigured, fetchTasks } from "@/lib/bitrix";
import { telegramConfigured, fetchDialogs } from "@/lib/telegram";
import { notionConnected, notionStatus, searchNotion, pageContent, fetchNotionTasks } from "@/lib/notion";
import { driveBrainContext, readDriveFile } from "@/lib/google";
import { listBlocklist, isBlocked } from "@/lib/brain-blocklist";

/**
 * «Второй мозг» — граф знаний, который ИИ собирает из всего подключённого
 * контекста (задачи, заметки, календарь, почта, Telegram, Notion, …).
 * Здесь — серверная схема данных графа и промпт генерации. Снапшоты графа
 * лежат в ws_brain (CRUD через общий /api/workspace/[kind]).
 */

// Режимы вынесены в отдельный модуль — константы нужны и на клиенте.
export { BRAIN_MODES, BRAIN_MODE_LABEL, brainMode, type BrainMode } from "@/lib/brain-modes";
import { MODE_SPEC, type BrainMode as Mode } from "@/lib/brain-modes";

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
 * проекты, подписки, Bitrix, все диалоги Telegram, почту без фильтров, весь
 * доступный Notion (список страниц + содержимое свежих + задачи из базы) и
 * проиндексированные файлы Google Drive (имена + выжимки текста).
 * Новости / тренды GitHub / музыка сюда НЕ входят — это не личные данные.
 */
export async function collectBrainContext(mode: Mode = "balanced"): Promise<{ context: string; sources: string[] }> {
  const modeSpec = MODE_SPEC[mode];
  const parts: string[] = [];
  const sources: string[] = [];
  // Индекс раздела с Диском в parts — ему полагается отдельная доля бюджета.
  let driveIndex = -1;
  const add = (title: string, body: string, src: string) => {
    if (body) { parts.push(`${title}:\n${body}`); sources.push(src); }
  };

  // Drive идёт ПЕРВЫМ, а не последним. Он самый объёмный источник, и когда он
  // стоял в хвосте, при переполнении окна модели обрезался именно он — со
  // стороны это выглядело как «мозг не читает диск» без единой ошибки в логах.
  try {
    const drive = await driveBrainContext(modeSpec.driveFiles, modeSpec.driveChars);
    if (drive.text) {
      driveIndex = parts.push(drive.text) - 1;
      sources.push(drive.label || "Google Drive");
    } else if (drive.label) {
      sources.push(drive.label);
    }
  } catch (e) {
    driveIndex = parts.push(`GOOGLE DRIVE: ошибка чтения — ${(e as Error).message.slice(0, 200)}`) - 1;
  }

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
      // includeDone: закрытые задачи для графа так же ценны, как открытые.
      const bx = await fetchTasks(60, true);
      add(
        "BITRIX ЗАДАЧИ (все, включая завершённые)",
        bx.map((t) => `- ${t.title} (${t.status}${t.deadline ? `, до ${t.deadline}` : ""}${t.groupName ? `, проект: ${t.groupName}` : ""}${t.responsible ? `, отв.: ${t.responsible}` : ""})`).join("\n"),
        `Bitrix (${bx.length})`,
      );
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

  // Общий потолок. Раньше его не было вовсе: контекст мог вырасти до сотен
  // тысяч символов, и обрезал его уже провайдер — с конца и молча. Режем сами,
  // с хвоста каждого раздела, чтобы ни один источник не пропал целиком.
  const context = capContext(parts, modeSpec.contextChars, driveIndex, modeSpec.driveShare);
  return { context, sources };
}

/** Обрезать раздел по границе строки, чтобы не рвать запись посередине. */
function trimPart(p: string, budget: number): string {
  if (p.length <= budget) return p;
  const cut = p.slice(0, budget);
  const lastBreak = cut.lastIndexOf("\n");
  const body = lastBreak > budget * 0.5 ? cut.slice(0, lastBreak) : cut;
  return `${body}\n… (раздел обрезан по лимиту контекста)`;
}

/**
 * Ужать разделы под общий лимит. Диску выделяется отдельная доля (driveShare):
 * раньше бюджет делился поровну по числу разделов, и Диск на сотню файлов
 * получал столько же, сколько заметки на две записи, — при десятке источников
 * от него оставались считанные проценты. Всё, что Диск не выбрал из своей доли,
 * возвращается остальным, и наоборот.
 */
function capContext(parts: string[], limit: number, driveIndex: number, driveShare: number): string {
  if (parts.join("\n\n").length <= limit) return parts.join("\n\n");

  const rest = parts.filter((_, i) => i !== driveIndex);
  const drive = driveIndex >= 0 ? parts[driveIndex] : "";

  // Диск берёт свою долю, но не больше, чем занимает на самом деле.
  const driveBudget = driveIndex >= 0 ? Math.min(drive.length, Math.floor(limit * driveShare)) : 0;
  const restBudget = limit - driveBudget;

  const share = Math.floor(restBudget / Math.max(1, rest.length));
  const small = rest.filter((p) => p.length <= share);
  const surplus = small.reduce((n, p) => n + (share - p.length), 0);
  const bigCount = rest.length - small.length;
  const bigShare = share + (bigCount ? Math.floor(surplus / bigCount) : 0);

  const trimmed = parts.map((p, i) => (i === driveIndex ? trimPart(p, driveBudget) : trimPart(p, bigShare)));
  return trimmed.join("\n\n");
}

/**
 * Калибровка importance. Без неё модель ставит 4–5 почти всем, и «тяжёлое»
 * перестаёт отличаться от фона: вес узла в UI строится из этой шкалы.
 */
const IMPORTANCE_RUBRIC = [
  "ШКАЛА importance (соблюдай пропорции, иначе граф превращается в кашу):",
  "  5 — опора жизни/работы: 1–2 узла на весь граф, не больше. Убери его — рассыпется всё остальное.",
  "  4 — крупные активные направления: не более 15% узлов. Текущий проект, ключевой человек, главный дедлайн.",
  "  3 — обычная рабочая сущность: основная масса узлов.",
  "  2 — второстепенное: разовая задача, случайная переписка, мелкий факт.",
  "  1 — фон и шум: реклама, уведомления, автоматические письма, черновики без продолжения. Такому НИКОГДА не ставь выше 2.",
  "Не завышай: если сомневаешься между 3 и 4 — ставь 3. Оценивай по реальному весу в жизни пользователя, а не по тому, насколько запись свежая или громко звучит.",
].join("\n");

/**
 * Правило про уникальное. Без него модель отбрасывает всё, что не похоже на
 * привычные сущности (проект, человек, задача): файл с промптами, конфиг,
 * методичку, формулу. А это как раз то, чего больше нигде нет — потерять такое
 * дороже, чем сотню однотипных писем. Действует во всех режимах, включая
 * строгий: «строгий» про объём, а не про право выбрасывать невосстановимое.
 */
const UNIQUE_RUBRIC = [
  "УНИКАЛЬНОЕ НЕ ПРОПУСКАЙ — это важнее лимита на число узлов:",
  "- Если в данных встретился САМОДЕЛЬНЫЙ АРТЕФАКТ — заведи для него отдельный узел, даже если не понял до конца, что это.",
  "  Сюда входят: промпты и инструкции для ИИ, конфиги и настройки, формулы и параметры стратегий, шаблоны и заготовки,",
  "  чек-листы, личные методики и правила, куски кода и схемы, наборы ключей/эндпоинтов, черновики спецификаций.",
  "- Признак уникального: этого НЕТ больше нигде, воспроизвести по памяти нельзя. Такое пропускать нельзя ни в каком режиме.",
  "- Не сваливай несколько разных артефактов в один узел «Файлы» или «Заметки»: у каждого свой узел со своим label.",
  "- Если содержимое непонятно — всё равно заведи узел, а в summary честно опиши, что видишь («файл с набором промптов для …»).",
  "- Обычный поток (письма, сообщения, однотипные задачи) — наоборот, группируй и не раздувай.",
].join("\n");

/** Строгий промпт: модель должна вернуть ТОЛЬКО JSON графа. */
/** Текст запрета для промпта. Пустой список — пустая строка, лишнего шума в промпте не нужно. */
export function blocklistRule(patterns: string[]): string {
  if (!patterns.length) return "";
  return [
    "ЗАПРЕЩЁННЫЕ ТЕМЫ — НЕ создавай узлы, если название или суть содержит:",
    ...patterns.map((p) => `- ${p}`),
    "Это осознанное решение пользователя. Такие сущности пропускай молча, не заменяй синонимами и не объединяй в общий узел.",
  ].join("\n");
}

export function buildBrainPrompt(context: string, mode: Mode = "balanced", blocked: string[] = []): string {
  const spec = MODE_SPEC[mode];
  return [
    "Ты строишь «второй мозг» — граф знаний по личному рабочему пространству.",
    "Ниже полный снимок данных пользователя. Выдели сущности (проекты, задачи, люди, идеи, финансы, события, темы) как узлы и осмысленные связи между ними как рёбра.",
    "",
    spec.rule,
    "",
    "Требования:",
    `- ${spec.full}. Каждый узел: короткий label, категория, importance 1–5, summary в 1–2 предложения, source — откуда взято.`,
    "",
    IMPORTANCE_RUBRIC,
    "",
    UNIQUE_RUBRIC,
    ...(blocked.length ? ["", blocklistRule(blocked)] : []),
    "",
    "- Категории: предпочитай базовые work|project|idea|people|finance|learn|life|other. Если сущность явно не влезает — придумай СВОЮ короткую категорию (одно слово латиницей, напр. health, travel) и используй её последовательно для похожих узлов.",
    "- source.panel — одна из: tasks, notes, calendar, mail, telegram, notion, bitrix, drive, projects, subscriptions, news, other; source.ref — заголовок/название исходной записи.",
    `- РЁБРА ОБЯЗАТЕЛЬНЫ: ${spec.edges} (проект ↔ его задачи, человек ↔ переписка, подписка ↔ инструмент, тема ↔ заметка). Пустой массив edges — это ошибка. Не оставляй изолированных узлов. label ребра — краткая суть связи.`,
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
/**
 * Первый сбалансированный {...} в тексте. Считаем скобки, пропуская те, что
 * внутри строк, и уважая экранирование, — иначе «}» в summary ломает счёт.
 * null, если объект так и не закрылся (обрыв по max_tokens — им займётся
 * repairTruncatedJson).
 */
function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

export function parseBrainAnswer(raw: string, knownIds?: Set<string>): BrainData {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("модель не вернула JSON");
  // Берём ПЕРВЫЙ сбалансированный объект, а не всё до последней «}»: модель
  // порой пишет два объекта подряд или добавляет пояснение со скобками, и тогда
  // в парсер уезжало «{...}{...}» — «Unexpected non-whitespace character after JSON».
  text = firstJsonObject(text) ?? text.slice(start, end + 1);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    try {
      // Модель упёрлась в max_tokens и JSON обрезан — чиним: отсекаем до последнего
      // целого элемента массива и закрываем оставшиеся скобки.
      json = JSON.parse(repairTruncatedJson(text));
    } catch {
      // Не обрыв, а порча в середине (кавычка или перенос строки внутри summary).
      // Собираем что уцелело поэлементно, вместо того чтобы терять весь ответ.
      const nodes = salvageArray(text, "nodes");
      const edges = salvageArray(text, "edges");
      // Спасать было нечего — честная ошибка лучше, чем пустой граф, который
      // в дополнении выглядит как безобидное «нового ничего нет».
      if (!nodes.length && !edges.length) throw new Error("модель вернула нечитаемый JSON");
      json = { nodes, edges };
    }
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

/**
 * Спасти массив по элементам, когда весь JSON невалиден.
 *
 * Обрыв по токенам чинит repairTruncatedJson, но модель ломает JSON и в
 * середине: неэкранированная кавычка или перенос строки внутри summary — и
 * «Expected ',' or '}' after property value». Терять из-за одного узла все
 * остальные обидно, поэтому идём по элементам массива и разбираем каждый
 * отдельно: битые выбрасываем, целые оставляем.
 */
function salvageArray(text: string, key: string): unknown[] {
  const at = text.indexOf(`"${key}"`);
  if (at === -1) return [];
  const open = text.indexOf("[", at);
  if (open === -1) return [];

  const out: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;

  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") { if (depth === 0) start = i; depth++; continue; }
    if (c === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const chunk = text.slice(start, i + 1);
        try { out.push(JSON.parse(chunk)); } catch { /* битый элемент — пропускаем */ }
        start = -1;
      }
      continue;
    }
    // Массив закончился, а мы не внутри объекта — дальше уже другое поле.
    if (c === "]" && depth === 0) break;
  }
  return out;
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
export function buildBrainAugmentPrompt(
  shortcuts: string,
  context: string,
  mode: Mode = "balanced",
  blocked: string[] = [],
  /** Дополняем по вручную выбранным файлам — тон промпта меняется на «разбери именно это». */
  picked = false,
): string {
  const spec = MODE_SPEC[mode];
  return [
    "Ты ДОПОЛНЯЕШЬ существующий «второй мозг» — граф знаний по личному рабочему пространству.",
    "Ниже шорткаты уже существующих узлов (id | label | категория) и свежий снимок данных.",
    "",
    "Твоя задача: найти в данных ТОЛЬКО НОВОЕ — сущности, которых ещё нет среди шорткатов, — и связать их с существующими узлами.",
    "",
    spec.rule,
    "",
    "Требования:",
    `- Верни только новые узлы (${spec.delta}). НЕ повторяй и НЕ пересказывай существующие: если сущность уже есть в шорткатах (даже под чуть другим названием) — не добавляй её.`,
    "- Каждый новый узел: короткий label, категория, importance 1–5, summary в 1–2 предложения, source (panel: tasks|notes|calendar|mail|telegram|notion|bitrix|drive|projects|subscriptions|news|other, ref: заголовок записи).",
    mode === "free"
      ? "- Шум (рассылки, промо, уведомления) заводить можно, но строго importance 1–2 — он должен осесть в фоне графа."
      : "- НЕ ЗАВОДИ УЗЛЫ ДЛЯ ШУМА: рассылки, промо, уведомления сервисов, одноразовые письма, случайные сообщения без темы. Если сущность живёт один день и ни с чем не связана — её не надо. Лучше вернуть 2 сильных узла, чем 12 мусорных. НО самодельный артефакт (промпт, конфиг, шаблон, формула, методика) шумом НЕ считается, даже если встретился один раз — его заводи всегда.",
    "- Дельта почти никогда не содержит узлов на 5 и редко на 4: новое обычно начинается с 2–3 и вырастает позже.",
    "",
    IMPORTANCE_RUBRIC,
    "",
    UNIQUE_RUBRIC,
    ...(blocked.length ? ["", blocklistRule(blocked)] : []),
    "",
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
    ...(picked
      ? [
          "ВАЖНО: пользователь выбрал эти материалы ВРУЧНУЮ и ждёт, что ты разберёшь именно их.",
          "Не отмахивайся оценкой «незначимо»: раз выбрано — значимо. Вытащи из каждого конкретику:",
          "сущности, инструменты, методики, промпты, формулы, имена, решения — и заведи узлы на них.",
          "Вернуть пустую дельту здесь можно ТОЛЬКО если всё содержимое уже есть в шорткатах.",
          "",
        ]
      : []),
    picked ? "ВЫБРАННОЕ (полный текст):" : "СВЕЖИЕ ДАННЫЕ:",
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
    // Дубликаты ВНУТРИ одной дельты: сверки со старым графом мало — модель
    // регулярно выдаёт один и тот же узел дважды за раз, и оба проходили.
    byLabel.set(norm(n.label), n.id);
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
export async function generateBrainData(mode: Mode = "balanced"): Promise<{ data: BrainData; sources: string[] }> {
  const spec = MODE_SPEC[mode];
  const { context, sources } = await collectBrainContext(mode);
  const blocked = (await listBlocklist()).map((b) => b.pattern);
  const answer = await askAI(buildBrainPrompt(context, mode, blocked), {
    task: "brain",
    temperature: spec.temperature,
    maxTokens: spec.maxTokens,
  });
  let data = dropBlocked(parseBrainAnswer(answer), blocked);
  if (!data.nodes.length) throw new Error("модель вернула пустой граф");

  // Модель поскупилась на связи — досвязываем отдельным коротким запросом.
  if (data.nodes.length >= 4 && data.edges.length < data.nodes.length / 2) {
    try {
      const extra = await askAI(buildEdgesPrompt(buildBrainShortcuts(data)), { task: "brain", temperature: 0.3, maxTokens: 2000 });
      const delta = parseBrainAnswer(extra, new Set(data.nodes.map((n) => n.id)));
      data = mergeBrainDelta(data, { nodes: [], edges: delta.edges }).data;
    } catch { /* граф без части связей лучше, чем ошибка */ }
  }
  return { data, sources };
}

/** Полный пересбор с сохранением НОВЫМ снапшотом (не трогая старые). */
export async function rebuildBrainSnapshot(
  titleSuffix = "",
  mode: Mode = "balanced",
): Promise<{ title: string; nodes: number; edges: number }> {
  const { data } = await generateBrainData(mode);
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
  /** Что реально попало в контекст — иначе «диск не читается» неотличимо от
   *  «диск прочитан, но модель ничего оттуда не взяла». */
  sources?: string[];
}

/**
 * Контекст из конкретных файлов Диска — для точечного дополнения.
 *
 * Отличие от обычного прохода принципиальное: там выжимки по 500–6000 символов
 * с сотни файлов и модель сама решает, что важно. Здесь — ПОЛНЫЙ текст (до 20k)
 * нескольких выбранных файлов, то есть «прочитай вот это внимательно».
 */
async function pickedFilesContext(fileIds: string[]): Promise<{ context: string; sources: string[] }> {
  const parts: string[] = [];
  const sources: string[] = [];

  for (const id of fileIds.slice(0, 20)) {
    try {
      const file = await readDriveFile(id);
      if (!file?.text?.trim()) {
        sources.push(`${file?.name ?? id} (пусто)`);
        continue;
      }
      parts.push(`ФАЙЛ «${file.name}»:
${file.text}`);
      sources.push(file.name);
    } catch (e) {
      sources.push(`${id} (ошибка: ${(e as Error).message.slice(0, 60)})`);
    }
  }

  return { context: parts.join("\n\n"), sources };
}

/**
 * Контекст из конкретных проектов — вторая половина точечного дополнения.
 *
 * В общем проходе проекты идут списком по 300 символов описания, и импортированное
 * с гитхаба (где описание — это фактически README) обрезается до первого абзаца.
 * Здесь описание берётся целиком.
 */
async function pickedProjectsContext(ids: string[]): Promise<{ context: string; sources: string[] }> {
  const parts: string[] = [];
  const sources: string[] = [];
  if (!ids.length) return { context: "", sources };

  try {
    const list = await sbSelect<{ id: string; title: string; description: string; tags: string; repo_url: string | null }>(
      "ws_projects",
      // in.(…) вместо запроса на каждый id — один round-trip. Кавычки внутри id
      // невозможны (uuid), но encodeURIComponent всё равно обязателен для скобок.
      `select=id,title,description,tags,repo_url&id=in.(${encodeURIComponent(ids.slice(0, 20).join(","))})`,
    );
    for (const p of list) {
      const body = p.description.trim();
      if (!body) {
        sources.push(`${p.title} (без описания)`);
        continue;
      }
      parts.push(
        [
          `ПРОЕКТ «${p.title}»${p.tags ? ` (${p.tags})` : ""}${p.repo_url ? ` — ${p.repo_url}` : ""}:`,
          body,
        ].join("\n"),
      );
      sources.push(p.title);
    }
  } catch (e) {
    sources.push(`проекты (ошибка: ${(e as Error).message.slice(0, 60)})`);
  }

  return { context: parts.join("\n\n"), sources };
}

/**
 * Инкремент: дополнить последний снапшот только новым из источников.
 *
 * С `fileIds`/`projectIds` работает точечно — читает целиком именно эти файлы
 * Диска и проекты и ничего больше. Это ответ на «модель прочитала пласт по игре
 * и всё равно ничего не взяла»: когда файл один, ей некуда деться.
 */
export async function augmentLatestBrain(
  mode: Mode = "balanced",
  opts: { fileIds?: string[]; projectIds?: string[] } = {},
): Promise<AugmentResult> {
  const spec = MODE_SPEC[mode];
  const snapshot = await latestBrainSnapshot();
  if (!snapshot || !snapshot.data.nodes.length) {
    return { skipped: "нет снапшота — сначала собери мозг полностью", added: 0, edges: 0, labels: [] };
  }
  // Источники точечного дополнения складываются: можно выбрать и файлы, и проекты.
  const hasPicks = !!(opts.fileIds?.length || opts.projectIds?.length);
  let picked: { context: string; sources: string[] } | null = null;
  if (hasPicks) {
    const [f, p] = await Promise.all([
      pickedFilesContext(opts.fileIds ?? []),
      pickedProjectsContext(opts.projectIds ?? []),
    ]);
    picked = {
      context: [f.context, p.context].filter(Boolean).join("\n\n"),
      sources: [...f.sources, ...p.sources],
    };
  }
  if (picked && !picked.context) {
    return { skipped: "из выбранного не удалось прочитать текст", added: 0, edges: 0, labels: [], sources: picked.sources };
  }
  const { context, sources } = picked ?? (await collectBrainContext(mode));
  const blocked = (await listBlocklist()).map((b) => b.pattern);
  const answer = await askAI(buildBrainAugmentPrompt(buildBrainShortcuts(snapshot.data), context, mode, blocked, !!picked), {
    // Дельта короче полной сборки — половины бюджета режима хватает.
    temperature: Math.max(0.2, spec.temperature - 0.1),
    maxTokens: Math.round(spec.maxTokens / 2),
  });
  const delta = dropBlocked(parseBrainAnswer(answer, new Set(snapshot.data.nodes.map((n) => n.id))), blocked);
  const { data, addedNodes, addedEdges, labels } = mergeBrainDelta(snapshot.data, delta);
  if (addedNodes || addedEdges) {
    await sbUpdate("ws_brain", `id=eq.${encodeURIComponent(snapshot.id)}`, { data, updated_at: new Date().toISOString() });
  }
  return { id: snapshot.id, title: snapshot.title, added: addedNodes, edges: addedEdges, labels, data, sources };
}

/**
 * Детализация: углубить одну категорию (или тему) последнего снапшота —
 * модель видит её узлы С summary, остальной граф шорткатами, и добавляет
 * под-узлы с конкретикой из данных.
 */
export async function expandBrainCategory(category: string, mode: Mode = "balanced"): Promise<AugmentResult> {
  const spec = MODE_SPEC[mode];
  const blocked = (await listBlocklist()).map((b) => b.pattern);
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
  const { context, sources } = await collectBrainContext(mode);
  const prompt = [
    `Ты ДЕТАЛИЗИРУЕШЬ часть «второго мозга» — узлы категории/темы «${category}».`,
    "",
    "УЗЛЫ ДЛЯ ДЕТАЛИЗАЦИИ (id | label | summary):",
    targets.map((n) => `${n.id} | ${n.label} | ${n.summary}`).join("\n"),
    "",
    "ОСТАЛЬНОЙ ГРАФ (шорткаты id | label | категория):",
    buildBrainShortcuts(snapshot.data),
    "",
    spec.rule,
    "",
    `Добавь ${mode === "strict" ? "3–8" : mode === "free" ? "15–50" : "3–15"} НОВЫХ узлов-деталей: конкретные подзадачи, факты, люди, документы, суммы, даты из данных ниже, относящиеся к этим узлам. Свяжи каждый новый узел рёбрами с детализируемыми (и при необходимости между собой).`,
    "Категории новых узлов — та же или уточнённая; id — новые slug (nd1, nd2…). НЕ дублируй существующее.",
    "Узлы-детали почти всегда importance 2–3: деталь не может весить больше того, что она детализирует.",
    "",
    IMPORTANCE_RUBRIC,
    "",
    UNIQUE_RUBRIC,
    "",
    'Ответь ТОЛЬКО валидным JSON: {"nodes":[…],"edges":[…]}',
    "",
    "ДАННЫЕ:",
    context,
  ].join("\n");
  const answer = await askAI(prompt, {
    temperature: Math.max(0.2, spec.temperature - 0.1),
    maxTokens: Math.round(spec.maxTokens / 2),
  });
  const delta = dropBlocked(parseBrainAnswer(answer, new Set(snapshot.data.nodes.map((n) => n.id))), blocked);
  const { data, addedNodes, addedEdges, labels } = mergeBrainDelta(snapshot.data, delta);
  if (addedNodes || addedEdges) {
    await sbUpdate("ws_brain", `id=eq.${encodeURIComponent(snapshot.id)}`, { data, updated_at: new Date().toISOString() });
  }
  return { id: snapshot.id, title: snapshot.title, added: addedNodes, edges: addedEdges, labels, data, sources };
}

/**
 * Выкинуть из ответа модели всё, что под запретом. Промпта мало: модель
 * регулярно заводит запрещённый узел всё равно, а рёбра на него потом висят
 * в никуда — поэтому режем и узлы, и связи с ними.
 */
export function dropBlocked(data: BrainData, patterns: string[]): BrainData {
  if (!patterns.length) return data;
  const nodes = data.nodes.filter((n) => !isBlocked(n, patterns));
  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, edges: data.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
}

/* ---- чистка графа ------------------------------------------------------ */

export interface CleanPlan {
  /** Узлы под удаление: id + название + причина, чтобы решение было проверяемым. */
  nodes: { id: string; label: string; reason: string }[];
  /** Сколько связей уйдёт: битые, петли, дубли и висящие после удаления узлов. */
  edges: number;
  /** Что останется. */
  keptNodes: number;
  keptEdges: number;
}

export interface CleanResult extends CleanPlan {
  applied: boolean;
  id?: string;
  data?: BrainData;
}

/** Слипшиеся пробелы/регистр/кавычки — иначе «TeleportHQ  UI» и «teleporthq ui» разные. */
function normLabel(s: string): string {
  return s.toLowerCase().replace(/[«»"'`]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Найти мусор в графе. Только детерминированные правила — никакой модели:
 * решение должно быть предсказуемым и объяснимым, иначе кнопка «почистить»
 * превращается в лотерею над единственным снапшотом.
 *
 * Мусором считаем:
 *  1) дубликаты по названию — остаётся самый весомый (importance, потом связность);
 *  2) узлы без единой связи и с importance ≤ 2 — они ни на что не влияют;
 *  3) узлы с пустым названием.
 *
 * Связи чистим отдельно: петли, дубли, ссылки на несуществующие узлы.
 */
export function planBrainCleanup(
  data: BrainData,
  opts: { dropLonely?: boolean; blocked?: string[] } = {},
): CleanPlan {
  const { nodes, edges } = data;

  const degree = new Map<string, number>();
  for (const e of edges) {
    if (e.from === e.to) continue;
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }

  const drop = new Map<string, string>();

  // 1. Дубликаты по названию.
  const groups = new Map<string, typeof nodes>();
  for (const n of nodes) {
    const key = normLabel(n.label);
    if (!key) continue;
    const g = groups.get(key);
    if (g) g.push(n); else groups.set(key, [n]);
  }
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // Победитель: выше importance, при равенстве — больше связей, потом длиннее summary.
    const winner = [...group].sort((a, b) =>
      b.importance - a.importance ||
      (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
      (b.summary?.length ?? 0) - (a.summary?.length ?? 0),
    )[0];
    for (const n of group) {
      if (n.id !== winner.id) drop.set(n.id, `дубль «${winner.label}»`);
    }
  }

  // 2. Чёрный список, пустые названия и одинокая мелочь.
  const blocked = opts.blocked ?? [];
  for (const n of nodes) {
    if (drop.has(n.id)) continue;
    const hit = blocked.length ? isBlocked(n, blocked) : null;
    if (hit) { drop.set(n.id, `чёрный список: «${hit}»`); continue; }
    if (!normLabel(n.label)) { drop.set(n.id, "пустое название"); continue; }
    if (opts.dropLonely && !(degree.get(n.id) ?? 0) && n.importance <= 2) {
      drop.set(n.id, "без связей и незначимый");
    }
  }

  const keptIds = new Set(nodes.filter((n) => !drop.has(n.id)).map((n) => n.id));

  // 3. Связи: петли, дубли, битые концы, висящие после удаления узлов.
  const seen = new Set<string>();
  let keptEdges = 0;
  for (const e of edges) {
    if (e.from === e.to) continue;
    if (!keptIds.has(e.from) || !keptIds.has(e.to)) continue;
    const key = [e.from, e.to].sort().join("→");
    if (seen.has(key)) continue;
    seen.add(key);
    keptEdges++;
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: [...drop].map(([id, reason]) => ({ id, label: byId.get(id)?.label ?? id, reason })),
    edges: edges.length - keptEdges,
    keptNodes: keptIds.size,
    keptEdges,
  };
}

/** Применить план к данным. Рёбра дублей переезжают на выжившего, а не теряются. */
export function applyBrainCleanup(data: BrainData, plan: CleanPlan): BrainData {
  const dropIds = new Set(plan.nodes.map((n) => n.id));
  const nodes = data.nodes.filter((n) => !dropIds.has(n.id));

  // Связи удалённого дубля не выбрасываем: переносим на узел с тем же названием.
  // Для узлов из чёрного списка переносить некуда — их близнецы удалены тоже.
  const byLabel = new Map(nodes.map((n) => [normLabel(n.label), n.id]));
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const remap = new Map<string, string>();
  for (const id of dropIds) {
    const target = byLabel.get(normLabel(byId.get(id)?.label ?? ""));
    if (target) remap.set(id, target);
  }

  const keptIds = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges = data.edges
    .map((e) => ({ ...e, from: remap.get(e.from) ?? e.from, to: remap.get(e.to) ?? e.to }))
    .filter((e) => {
      if (e.from === e.to) return false;
      if (!keptIds.has(e.from) || !keptIds.has(e.to)) return false;
      const key = [e.from, e.to].sort().join("→");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { nodes, edges };
}

/**
 * Чистка последнего снапшота. Без `apply` возвращает только план — кнопка
 * должна показывать, что именно исчезнет, до того как оно исчезнет.
 */
export async function cleanLatestBrain(
  opts: { apply?: boolean; dropLonely?: boolean } = {},
): Promise<CleanResult> {
  const snapshot = await latestBrainSnapshot();
  if (!snapshot || !snapshot.data.nodes.length) {
    return { nodes: [], edges: 0, keptNodes: 0, keptEdges: 0, applied: false };
  }

  const blocked = (await listBlocklist()).map((b) => b.pattern);
  const plan = planBrainCleanup(snapshot.data, { dropLonely: opts.dropLonely, blocked });
  if (!opts.apply || (!plan.nodes.length && !plan.edges)) {
    return { ...plan, applied: false, id: snapshot.id };
  }

  const data = applyBrainCleanup(snapshot.data, plan);
  await sbUpdate("ws_brain", `id=eq.${encodeURIComponent(snapshot.id)}`, {
    data,
    updated_at: new Date().toISOString(),
  });
  return { ...plan, applied: true, id: snapshot.id, data };
}
