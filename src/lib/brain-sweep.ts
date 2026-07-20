/**
 * Полный обход Диска — «прочитать вообще всё и внести в мозг».
 *
 * Почему это отдельный механизм, а не ещё один режим `augment`. Обычное
 * дополнение кладёт в один запрос выжимки с сотни файлов, и модель сама решает,
 * что достойно узла, — на большом объёме она стабильно проходит мимо половины.
 * Здесь наоборот: файлы идут ПАЧКАМИ по несколько штук, каждый ЦЕЛИКОМ, и на
 * каждой пачке у модели нет выбора «посмотреть по диагонали» — материала мало,
 * а требование разобрать его до конца прямое.
 *
 * Обход разбит на итерации не ради красоты прогресс-бара, а по необходимости:
 * функция на Vercel живёт ограниченное время, и сотня файлов в один вызов не
 * укладывается ни по времени, ни по контексту. Поэтому состояние обхода — это
 * ровно одно число (курсор в стабильно отсортированном списке файлов), которое
 * возвращается клиенту и приходит обратно со следующим запросом. Ничего
 * серверного между итерациями не живёт: обход можно прервать, закрыть вкладку
 * и продолжить с того же места.
 *
 * Почта и телеграм сюда не входят намеренно — это поток сообщений, а не
 * документы; они и так засоряли граф, ради чего заводился чёрный список.
 */

import { listAllIndexedFiles } from "@/lib/google";
import { augmentLatestBrain, latestBrainSnapshot, type BrainData } from "@/lib/brain";
import { sbSelect, sbUpsert } from "@/lib/supabase";

/**
 * Файлов в пачке. Подобрано под то, что читается ЦЕЛИКОМ: восемь документов —
 * это уже десятки тысяч символов, дальше растёт риск и по времени функции, и по
 * тому, что модель начнёт экономить на последних файлах пачки.
 */
const BATCH = 8;

/** Что именно обходим: всё подряд или только неразобранное. */
export type SweepScope = "all" | "new";

export interface SweepPlan {
  /** Всего файлов в индексе. */
  files: number;
  /** Сколько итераций займёт обход целиком. */
  iterations: number;
  /** Файлов, которых обход ещё не видел (или которые изменились с тех пор). */
  newFiles: number;
  newIterations: number;
  batch: number;
}

/**
 * Что уже разобрано: file_id → md5 той версии, которая ушла в мозг.
 *
 * Сравнение по md5, а не по факту «файл встречался»: отредактированный документ
 * — это новый материал, и он должен вернуться в очередь. Отсутствие md5 у файла
 * (Drive не отдаёт его для Google Docs) трактуем как «версия не отслеживается»,
 * такой файл считается разобранным навсегда — иначе каждый обход перечитывал бы
 * все документы Google заново.
 */
async function loadSeen(): Promise<Map<string, string>> {
  try {
    const rows = await sbSelect<{ file_id: string; md5: string }>("ws_brain_seen", "select=file_id,md5&limit=5000");
    return new Map(rows.map((r) => [r.file_id, r.md5 ?? ""]));
  } catch {
    // Таблицы может не быть (миграция не применена) — тогда обход просто
    // работает как раньше, по всему Диску, а не падает.
    return new Map();
  }
}

async function markSeen(files: { file_id: string; md5: string | null }[]): Promise<void> {
  await Promise.all(
    files.map((f) =>
      sbUpsert("ws_brain_seen", { file_id: f.file_id, md5: f.md5 ?? "", seen_at: new Date().toISOString() }, "file_id")
        .catch(() => { /* отметка — не повод ронять обход */ }),
    ),
  );
}

/** Неразобранные файлы в стабильном порядке. */
function unseenOf(
  files: { file_id: string; name: string; md5: string | null }[],
  seen: Map<string, string>,
) {
  return files.filter((f) => !seen.has(f.file_id) || seen.get(f.file_id) !== (f.md5 ?? ""));
}

export interface SweepStep {
  done: boolean;
  /** Курсор для следующего вызова. */
  cursor: number;
  files: number;
  iteration: number;
  iterations: number;
  /** Имена файлов этой пачки — чтобы в панели было видно, что именно читается. */
  batch: string[];
  added: number;
  edges: number;
  labels: string[];
  /**
   * Граф после этой итерации. Возвращается каждый раз, чтобы панель росла на
   * глазах: на восемнадцати итерациях смотреть десять минут в пустой холст и
   * ждать финала — worse, чем лишние килобайты по сети. Это тот же объём, что
   * ушёл бы на перезапрос снапшота, но без второго round-trip.
   */
  data?: BrainData;
  /** Заполняется, когда пачку разобрать не вышло: обход при этом НЕ прерывается. */
  error?: string;
}

/** Сколько итераций займёт обход — это же число показывается до старта. */
export async function planSweep(): Promise<SweepPlan> {
  const [files, seen] = await Promise.all([listAllIndexedFiles(), loadSeen()]);
  const fresh = unseenOf(files, seen);
  return {
    files: files.length,
    iterations: Math.ceil(files.length / BATCH),
    newFiles: fresh.length,
    newIterations: Math.ceil(fresh.length / BATCH),
    batch: BATCH,
  };
}

/**
 * Краткая сводка «что уже сделано» для следующей итерации.
 *
 * Собирается детерминированно из текущего снапшота, без обращения к модели:
 * лишний запрос на каждой итерации удвоил бы и время, и цену обхода. Модели
 * нужно понимать масштаб и разрез уже собранного, а не его содержимое —
 * содержимое она и так видит в шорткатах.
 */
async function buildCarry(processed: number, total: number): Promise<string> {
  const snap = await latestBrainSnapshot();
  if (!snap) return "";
  const byCat = new Map<string, number>();
  for (const n of snap.data.nodes) byCat.set(n.category, (byCat.get(n.category) ?? 0) + 1);
  const cats = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c}: ${n}`)
    .join(", ");
  return [
    `Разобрано файлов: ${processed} из ${total}.`,
    `В графе сейчас ${snap.data.nodes.length} узлов и ${snap.data.edges.length} связей.`,
    cats ? `Категории: ${cats}.` : "",
    "Если какая-то категория подозрительно пуста при том, что материал по ней в файлах есть, — добирай её.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Одна итерация обхода: прочитать очередную пачку и влить её в мозг.
 *
 * Один вызов = одна пачка, сознательно. Класть в вызов «сколько успеется за
 * N секунд» — значит однажды упереться в таймаут посреди запроса к модели и
 * потерять и пачку, и деньги за неё, не сдвинув курсор.
 */
export async function sweepStep(cursor: number, scope: SweepScope = "all"): Promise<SweepStep> {
  const [all, seen] = await Promise.all([listAllIndexedFiles(), loadSeen()]);

  // В режиме «только новое» курсор не нужен и был бы вреден: очередь тает по
  // ходу обхода (разобранное уходит в ws_brain_seen), и любой сохранённый
  // индекс в неё уже не попадает. Поэтому всегда берём голову очереди.
  const pool = scope === "new" ? unseenOf(all, seen) : all;
  const total = pool.length;
  const iterations = Math.ceil(total / BATCH);
  const from = scope === "new" ? 0 : Math.max(0, Math.min(cursor, total));

  const base = { files: total, iterations, iteration: Math.floor(from / BATCH) + 1 };
  if (from >= total) {
    return { ...base, done: true, cursor: total, batch: [], added: 0, edges: 0, labels: [] };
  }

  const slice = pool.slice(from, from + BATCH);
  const next = from + slice.length;
  const carry = await buildCarry(scope === "new" ? all.length - total : from, all.length);
  const names = slice.map((f) => f.name);
  // Отмечаем ДО разбора и независимо от его исхода — по той же причине, по
  // которой двигается курсор: файл, на котором спотыкается модель или Drive,
  // иначе встаёт стеной и очередь «только новое» не сдвинется никогда.
  await markSeen(slice);

  try {
    const r = await augmentLatestBrain("total", {
      fileIds: slice.map((f) => f.file_id),
      maxFiles: BATCH,
      sweep: { index: base.iteration, total: iterations, carry },
    });
    return {
      ...base,
      done: next >= total,
      cursor: next,
      batch: names,
      added: r.added,
      edges: r.edges,
      labels: r.labels,
      data: r.data,
      // `skipped` — это «нечего было брать», а не сбой: показываем, но обход идёт дальше.
      error: r.skipped,
    };
  } catch (e) {
    return {
      ...base,
      done: next >= total,
      cursor: next,
      batch: names,
      added: 0,
      edges: 0,
      labels: [],
      error: (e as Error).message,
    };
  }
}
