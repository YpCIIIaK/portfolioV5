import { askAI } from "@/lib/ai";
import { sendTelegram, sendEmail } from "@/lib/notify";
import { supabaseConfigured, sbSelect, sbInsert } from "@/lib/supabase";
import { webFetch, webSearch } from "@/lib/web";
import { augmentLatestBrain } from "@/lib/brain";
import {
  renderTemplate,
  STEP_META,
  type StepResult,
  type Workflow,
  type WorkflowData,
  type WorkflowStep,
} from "@/lib/workflow-steps";
import type { Priority } from "@/lib/workspace";

/**
 * Исполнение воркфлоу — серверная часть. Каталог блоков и шаблоны живут в
 * `workflow-steps.ts` (их видит и клиент), здесь — только обработчики и цикл.
 *
 * Цепочка линейная: шаг получает подставленные параметры, возвращает текст, и
 * этот текст становится `{{prev}}` для следующего. Каждый запуск целиком
 * пишется в ws_workflow_runs — история не перетирается и её видно в панели.
 */

const PRIORITIES = ["none", "low", "medium", "high"] as const;
function asPriority(v: string): Priority {
  return (PRIORITIES as readonly string[]).includes(v) ? (v as Priority) : "none";
}

type StepRunner = (p: Record<string, string>) => Promise<string>;

const RUNNERS: Record<string, StepRunner> = {
  async text(p) {
    return p.text ?? "";
  },

  async ai(p) {
    if (!p.prompt) throw new Error("пустой промпт");
    return askAI(p.prompt, { system: p.system || undefined, temperature: 0.4 });
  },

  async telegram(p) {
    if (!p.text) throw new Error("пустой текст сообщения");
    const ok = await sendTelegram(p.text, p.format === "plain" ? "plain" : "markdown");
    if (!ok) throw new Error("Telegram не настроен или отклонил сообщение");
    return `Отправлено в Telegram (${p.text.length} симв.)`;
  },

  async email(p) {
    if (!p.subject || !p.text) throw new Error("нужны тема и текст");
    const ok = await sendEmail(p.subject, p.text);
    if (!ok) throw new Error("Resend не настроен или отклонил письмо");
    return `Письмо отправлено: «${p.subject}»`;
  },

  async task(p) {
    requireSupabase();
    if (!p.title) throw new Error("пустое название задачи");
    await sbInsert("ws_tasks", {
      title: p.title.slice(0, 500),
      priority: asPriority(p.priority ?? ""),
      done: false,
      status: "todo",
      due: p.due || null,
      color: "",
    });
    return `Задача создана: «${p.title}»`;
  },

  async note(p) {
    requireSupabase();
    if (!p.title) throw new Error("пустой заголовок заметки");
    await sbInsert("ws_notes", {
      title: p.title.slice(0, 500),
      body: (p.body ?? "").slice(0, 20000),
      priority: asPriority(p.priority ?? ""),
      color: "",
    });
    return `Заметка сохранена: «${p.title}»`;
  },

  async event(p) {
    requireSupabase();
    if (!p.title) throw new Error("пустое название события");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date ?? "")) throw new Error("дата нужна в формате YYYY-MM-DD");
    await sbInsert("ws_events", {
      title: p.title.slice(0, 300),
      date: p.date,
      time: p.time || null,
      note: null,
      priority: "none",
      color: "",
    });
    return `Событие создано: «${p.title}» на ${p.date}`;
  },

  async web_search(p) {
    if (!p.query) throw new Error("пустой запрос");
    return webSearch(p.query);
  },

  async web_fetch(p) {
    if (!p.url) throw new Error("не указан URL");
    return webFetch(p.url);
  },

  async brain_augment() {
    requireSupabase();
    const r = await augmentLatestBrain();
    if (r.skipped) return `Пропущено: ${r.skipped}`;
    if (!r.added && !r.edges) return "Нового ничего нет — мозг актуален";
    return `Мозг дополнен: +${r.added} узл., +${r.edges} связ.${r.labels.length ? ` (${r.labels.join(", ")})` : ""}`;
  },
};

function requireSupabase() {
  if (!supabaseConfigured()) throw new Error("Supabase не настроен");
}

/** Блок известен и реализован — используется валидацией перед сохранением. */
export function isKnownStep(type: string): boolean {
  return type in RUNNERS && STEP_META.has(type);
}

export interface RunResult {
  ok: boolean;
  /** Вывод последнего успешного шага — итог цепочки. */
  output: string;
  steps: StepResult[];
}

/**
 * Прогнать цепочку. Первый упавший шаг останавливает выполнение: следующие
 * блоки почти всегда зависят от `{{prev}}`, и гнать их по пустому вводу — значит
 * насоздавать мусора (пустых задач, писем ни о чём).
 */
export async function runWorkflow(data: WorkflowData, input = ""): Promise<RunResult> {
  const vars: Record<string, string> = {
    input,
    prev: input,
    date: new Date().toISOString().slice(0, 10),
  };
  const steps: StepResult[] = [];
  let output = input;
  let ok = true;

  for (const step of data.steps) {
    const started = Date.now();
    const runner = RUNNERS[step.type];
    if (!runner) {
      steps.push({ id: step.id, type: step.type, ok: false, output: `Неизвестный блок «${step.type}»`, ms: 0 });
      ok = false;
      break;
    }
    try {
      const params = renderParams(step, vars);
      const result = await runner(params);
      steps.push({ id: step.id, type: step.type, ok: true, output: result, ms: Date.now() - started });
      vars.prev = result;
      vars[`step:${step.id}`] = result;
      output = result;
    } catch (e) {
      steps.push({ id: step.id, type: step.type, ok: false, output: (e as Error).message, ms: Date.now() - started });
      ok = false;
      break;
    }
  }

  return { ok, output, steps };
}

function renderParams(step: WorkflowStep, vars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(step.params)) {
    out[key] = renderTemplate(value, vars);
  }
  return out;
}

/* ---- хранилище -------------------------------------------------------- */

/** Запустить сохранённый воркфлоу по id и записать запуск в историю. */
export async function runSavedWorkflow(id: string, input = ""): Promise<RunResult & { title: string }> {
  requireSupabase();
  const rows = await sbSelect<Workflow>("ws_workflows", `select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  const wf = rows[0];
  if (!wf) throw new Error("воркфлоу не найден");
  if (!wf.data?.steps?.length) throw new Error(`в воркфлоу «${wf.title}» нет ни одного блока`);

  const result = await runWorkflow(wf.data, input);
  // История — best-effort: неудачная запись лога не должна прятать результат.
  try {
    await sbInsert("ws_workflow_runs", {
      workflow_id: wf.id,
      ok: result.ok,
      input: input.slice(0, 10000),
      output: result.output.slice(0, 20000),
      steps: result.steps,
    });
  } catch { /* лог не критичен */ }

  return { ...result, title: wf.title };
}

/** Найти воркфлоу по названию (для ассистента: он оперирует названиями). */
export async function findWorkflowByTitle(query: string): Promise<Workflow | null> {
  requireSupabase();
  const rows = await sbSelect<Workflow>(
    "ws_workflows",
    `select=*&title=ilike.*${encodeURIComponent(query)}*&order=updated_at.desc&limit=5`,
  );
  const q = query.trim().toLowerCase();
  return rows.find((r) => r.title.toLowerCase() === q) ?? rows[0] ?? null;
}

export async function listWorkflows(): Promise<Workflow[]> {
  requireSupabase();
  return sbSelect<Workflow>("ws_workflows", "select=*&order=updated_at.desc&limit=50");
}
