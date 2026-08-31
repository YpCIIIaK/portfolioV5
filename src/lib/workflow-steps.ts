import { z } from "zod";

/**
 * Общая модель воркфлоу — цепочки действий, которые владелец собирает из блоков
 * и запускает вручную или через ассистента.
 *
 * Этот модуль намеренно ЧИСТЫЙ: ни Supabase, ни Telegram, ни ИИ. Его импортируют
 * и клиентский конструктор (рисует форму шага по `fields`), и серверный раннер
 * (`workflow.ts`, там же живут реализации). Каталог шагов — единственный
 * источник правды: добавил блок сюда и обработчик в раннер — он сразу появился
 * в UI, в валидации API и в подсказке ассистенту.
 */

/* ---- документ воркфлоу ------------------------------------------------ */

export const workflowStep = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(40),
  /** Параметры блока — плоская карта строк, набор задаётся каталогом ниже. */
  params: z.record(z.string(), z.string().max(10000)).default({}),
}).passthrough();

export const workflowData = z.object({
  steps: z.array(workflowStep).max(50).default([]),
});

export type WorkflowStep = z.infer<typeof workflowStep>;
export type WorkflowData = z.infer<typeof workflowData>;

/** Сохранённая версия документа — «билды не затираются» (см. PATCH в API). */
export interface WorkflowVersion {
  at: string;
  data: WorkflowData;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  data: WorkflowData;
  versions: WorkflowVersion[];
  updated_at: string;
  created_at: string;
}

/** Результат одного шага в журнале запуска. */
export interface StepResult {
  id: string;
  type: string;
  ok: boolean;
  output: string;
  ms: number;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  ok: boolean;
  input: string;
  output: string;
  steps: StepResult[];
  created_at: string;
}

/* ---- каталог блоков --------------------------------------------------- */

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}

export interface StepMeta {
  type: string;
  label: string;
  /** Имя иконки lucide — конструктор резолвит его в компонент. */
  icon: string;
  /** Что делает блок: показывается в палитре и уходит в описание ассистенту. */
  hint: string;
  /** Блок что-то меняет во внешнем мире (шлёт, создаёт) — помечаем в UI. */
  writes?: boolean;
  fields: FieldDef[];
}

const PRIORITY_OPTIONS = [
  { value: "none", label: "Без приоритета" },
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

export const STEP_CATALOG: StepMeta[] = [
  {
    type: "ai",
    label: "ИИ-шаг",
    icon: "Sparkles",
    hint: "Отправить промпт модели и передать её ответ дальше по цепочке.",
    fields: [
      { key: "prompt", label: "Промпт", type: "textarea", required: true, placeholder: "Сократи до трех пунктов" },
      { key: "system", label: "Роль (system)", type: "textarea", placeholder: "Ты — редактор. Пиши сухо и по делу." },
      { key: "connect_previous", label: "Берть выход prev шага", type: "select", options: [
        { value: "", label: "Не подключать" },
        { value: "true", label: "Включить" },
      ], },
    ],
  },
  {
    type: "email",
    label: "Почта",
    icon: "Mail",
    hint: "Отправить письмо владельцу через Resend.",
    writes: true,
    fields: [
      { key: "subject", label: "Тема", type: "text", required: true, placeholder: "Сводка на {{date}}" },
      { key: "text", label: "Текст письма", type: "textarea", required: true, placeholder: "Сводка письма" },
      { key: "from", label: "Отправитель", type: "text", placeholder: "Portfolio <user@domain>" },
      { key: "connect_previous", label: "Берть выход prev шага", type: "select", options: [
        { value: "", label: "Не подключать" },
        { value: "true", label: "Включить" },
      ], },
    ],
  },
  {
    type: "imap_read",
    label: "Прочитать IMAP почту",
    icon: "Mail",
    hint: "Прочитать последние N писем из IMAP и передать дальше по цепочке",
    writes: true,
    fields: [
      { key: "limit", label: "Лимит писем", type: "text", placeholder: "50" },
      { key: "from_filter", label: "Фильтр отправителя", type: "text", placeholder: "email@domain.com (оставьте пустым, чтобы не фильтровать)" },
    ],
  },
  {
    type: "telegram",
    label: "Telegram",
    icon: "Send",
    hint: "Отправить сообщение в Telegram владельца.",
    writes: true,
    fields: [
      { key: "text", label: "Текст", type: "textarea", required: true, placeholder: "Итог за день" },
      {
        key: "format",
        label: "Формат",
        type: "select",
        options: [
          { value: "markdown", label: "Markdown" },
          { value: "plain", label: "Обычный текст" },
        ],
      },
      { key: "connect_previous", label: "Берть выход prev шага", type: "select", options: [
        { value: "", label: "Не подключать" },
        { value: "true", label: "Включить" },
      ], },
    ],
  },
  {
    type: "telegram_bot",
    label: "Telegram (бот)",
    icon: "Send",
    hint: "Отправить сообщение в Telegram через подключенного бота",
    writes: true,
    fields: [
      { key: "text", label: "Текст", type: "textarea", required: true, placeholder: "{{prev}}" },
      { key: "bot_name", label: "Имя бота", type: "text", placeholder: "Название бота в списке" },
      { key: "chat_override", label: "Chat ID", type: "text", placeholder: "Override chat ID (опционально)" },
    ],
  },
  {
    type: "email",
    label: "Почта",
    icon: "Mail",
    hint: "Отправить письмо владельцу через Resend.",
    writes: true,
    fields: [
      { key: "subject", label: "Тема", type: "text", required: true, placeholder: "Сводка на {{date}}" },
      { key: "text", label: "Текст письма", type: "textarea", required: true, placeholder: "Сводка письма" },
      { key: "from", label: "Отправитель", type: "text", placeholder: "Portfolio <user@domain>" },
      { key: "connect_previous", label: "Берть выход prev шага", type: "select", options: [
        { value: "", label: "Не подключать" },
        { value: "true", label: "Включить" },
      ], },
    ],
  },
  {
    type: "note",
    label: "Создать заметку",
    icon: "StickyNote",
    hint: "Сохранить заметку в разделе «Заметки».",
    writes: true,
    fields: [
      { key: "title", label: "Заголовок", type: "text", required: true, placeholder: "Отчёт {{date}}" },
      { key: "body", label: "Текст", type: "textarea", placeholder: "{{prev}}" },
      { key: "priority", label: "Приоритет", type: "select", options: PRIORITY_OPTIONS },
    ],
  },
  {
    type: "event",
    label: "Создать событие",
    icon: "CalendarDays",
    hint: "Добавить событие в календарь.",
    writes: true,
    fields: [
      { key: "title", label: "Название", type: "text", required: true },
      { key: "date", label: "Дата", type: "text", required: true, placeholder: "YYYY-MM-DD или {{date}}" },
      { key: "time", label: "Время", type: "text", placeholder: "HH:MM" },
    ],
  },
  {
    type: "web_search",
    label: "Поиск в интернете",
    icon: "Search",
    hint: "Найти в интернете и передать результаты дальше.",
    fields: [
      { key: "query", label: "Запрос", type: "text", required: true, placeholder: "новости про {{input}}" },
    ],
  },
  {
    type: "web_fetch",
    label: "Прочитать страницу",
    icon: "Globe",
    hint: "Скачать страницу по URL и передать её текст дальше.",
    fields: [
      { key: "url", label: "URL", type: "text", required: true, placeholder: "https://…" },
    ],
  },
  {
    type: "brain_augment",
    label: "Дополнить мозг",
    icon: "Brain",
    hint: "Инкрементально дополнить «второй мозг» новым из источников.",
    writes: true,
    fields: [],
  },
  {
    type: "text",
    label: "Текст",
    icon: "Type",
    hint: "Просто подставить текст (шаблон) — удобно как заготовка для следующих блоков.",
    fields: [
      { key: "text", label: "Текст", type: "textarea", required: true, placeholder: "{{input}}" },
    ],
  },
];

export const STEP_META = new Map(STEP_CATALOG.map((s) => [s.type, s]));

export function stepLabel(type: string): string {
  return STEP_META.get(type)?.label ?? type;
}

/* ---- шаблоны ---------------------------------------------------------- */

/**
 * Подстановка переменных: `{{input}}` — то, что подали на запуске, `{{prev}}` —
 * вывод предыдущего шага, `{{step:<id>}}` — вывод конкретного шага, `{{date}}` —
 * сегодняшняя дата. Неизвестная переменная схлопывается в пустую строку, чтобы
 * недозаполненный черновик не ронял весь запуск.
 */
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([\w:-]+)\s*\}\}/g, (_m, name: string) => vars[name] ?? "");
}

/** Человекочитаемая сводка воркфлоу — для списка в UI и для ассистента. */
export function describeWorkflow(w: { title: string; description?: string; data: WorkflowData }): string {
  const chain = w.data.steps.map((s) => stepLabel(s.type)).join(" → ") || "(пусто)";
  return `${w.title}${w.description ? ` — ${w.description}` : ""}: ${chain}`;
}
