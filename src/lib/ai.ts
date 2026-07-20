/**
 * Minimal OpenRouter client for the workspace AI agent — privacy-first.
 *
 * Two levers keep requests private (both on top of OpenRouter's default of NOT
 * logging prompts itself unless you opt in):
 *
 *  1. Account setting (do once): openrouter.ai/settings/privacy →
 *     turn OFF "providers that may train on inputs".
 *  2. Per-request (here): provider.data_collection = "deny" restricts routing to
 *     endpoints that don't retain your data (zero-data-retention). If a given
 *     free model has no such endpoint, OpenRouter returns 404 "no endpoints
 *     matching your data policy" — then switch model or set OPENROUTER_DATA_POLICY=allow.
 *
 * Regardless of the model, we also send a MINIMIZED context (titles/short
 * previews, never full message bodies) — the real privacy win.
 *
 * Модель не константа: она выбирается по задаче (см. ai-models.ts), поэтому у
 * мозга и у чата могут быть разные модели.
 */

import { resolveModel, type AiTask } from "@/lib/ai-models";

// "deny" = only zero-data-retention providers. Loosen to "allow" if a free model has none.
const DATA_POLICY = (process.env.OPENROUTER_DATA_POLICY ?? "deny") === "allow" ? "allow" : "deny";

/**
 * Потолок ответа по умолчанию. Раньше стояло 800/900 — развёрнутые ответы
 * обрывались на полуслове. Ставим с запасом; реально модель тратит столько,
 * сколько нужно, а лимит просто перестаёт резать. AI_MAX_TOKENS — на случай,
 * если у выбранной модели контекст меньше.
 */
const MAX_TOKENS = Math.max(256, Number(process.env.AI_MAX_TOKENS) || 8000);

export function aiConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

interface AskOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** Какой задаче принадлежит вызов — от неё зависит выбранная модель. */
  task?: AiTask;
  /** Явная модель, минуя настройки (сравнение моделей, отладка). */
  model?: string;
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** One-shot completion (no streaming). Throws with a helpful message on failure. */
export async function askAI(prompt: string, opts: AskOptions = {}): Promise<string> {
  return chatAI(
    [
      ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
      { role: "user" as const, content: prompt },
    ],
    opts,
  );
}

/** Low-level POST to OpenRouter's chat endpoint. Maps failures to clear errors. */
async function callOpenRouter(body: Record<string, unknown>): Promise<AssistantChoice> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY не задан");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "Workspace AI",
    },
    body: JSON.stringify({
      reasoning: { exclude: true },
      // Privacy: keep the request off training/logging providers.
      provider: { data_collection: DATA_POLICY, allow_fallbacks: true },
      ...body,
      // Модель — после спреда: иначе отсутствующий body.model затёр бы её на undefined.
      model: (body.model as string | undefined) ?? (await resolveModel("default")),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 404 && /data policy|no endpoints/i.test(detail)) {
      throw new Error(
        "Нет провайдера с zero-data-retention для этой модели. Смени OPENROUTER_MODEL или временно поставь OPENROUTER_DATA_POLICY=allow.",
      );
    }
    if (res.status === 429) throw new Error("Лимит бесплатной модели исчерпан, попробуй позже.");
    if (res.status === 401) throw new Error("Неверный OPENROUTER_API_KEY.");
    throw new Error(`Модель недоступна (${res.status}). ${detail.slice(0, 160)}`);
  }

  const json = (await res.json().catch(() => ({}))) as {
    choices?: { message?: AssistantChoice }[];
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "ошибка модели");
  const msg = json.choices?.[0]?.message;
  if (!msg) throw new Error("Модель вернула пустой ответ");
  return msg;
}

/**
 * Multi-turn completion over an explicit message list (system + conversation).
 *
 * Reasoning-модели изредка отдают пустой `content`: весь бюджет токенов ушёл в
 * рассуждение, а на ответ не осталось (`reasoning.exclude` убирает его из
 * выдачи, но не из счётчика). Один раз повторяем с удвоенным потолком и чуть
 * выше температурой — этого хватает почти всегда.
 */
export async function chatAI(messages: AiMessage[], opts: Omit<AskOptions, "system"> = {}): Promise<string> {
  const maxTokens = opts.maxTokens ?? MAX_TOKENS;
  const temperature = opts.temperature ?? 0.3;
  const model = opts.model ?? (await resolveModel(opts.task ?? "default"));

  for (const attempt of [0, 1]) {
    const msg = await callOpenRouter({
      model,
      messages,
      temperature: attempt ? Math.min(temperature + 0.2, 1) : temperature,
      max_tokens: attempt ? Math.min(maxTokens * 2, MAX_TOKENS) : maxTokens,
    });
    const text = msg.content?.trim();
    if (text) return text;
  }
  throw new Error("Модель вернула пустой ответ");
}

/* ---- tool calling ----------------------------------------------------- */

/** JSON-schema description of one callable tool (OpenAI/OpenRouter format). */
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** A tool invocation the model asked us to run. */
export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string of arguments — parse defensively at the call site. */
  arguments: string;
}

/** Assistant message as returned by the API (may carry tool_calls). */
interface AssistantChoice {
  role?: string;
  content?: string | null;
  tool_calls?: { id: string; type?: string; function: { name: string; arguments: string } }[];
}

/** Messages in a tool-calling loop: system/user text, assistant turns, tool results. */
export type AgentMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: AssistantChoice["tool_calls"] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolTurn {
  content: string;
  toolCalls: ToolCall[];
  /** Raw assistant message to append back into the conversation verbatim. */
  raw: AgentMessage;
}

/**
 * Recover tool calls a model wrote as plain text instead of emitting properly.
 *
 * Models without real function-calling on OpenRouter fall back to their own
 * training-time syntax and it lands in `content`. DeepSeek uses
 * `<｜DSML｜invoke name="…">`, others use a bare `<invoke>`. Without this the
 * raw markup is shown to the user as if it were the answer, and the tool never
 * runs. We normalise the delimiter noise away, then read it as plain tags.
 */
export function parseInlineToolCalls(content: string): { calls: ToolCall[]; text: string } {
  // Strip the provider-specific delimiters so one parser handles every dialect.
  const norm = content.replace(/｜DSML｜/g, "").replace(/antml:/g, "");
  if (!/<invoke\s+name=/i.test(norm)) return { calls: [], text: content };

  const calls: ToolCall[] = [];
  const invokeRe = /<invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/invoke>/gi;
  const paramRe = /<parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/parameter>/gi;

  for (let m = invokeRe.exec(norm); m; m = invokeRe.exec(norm)) {
    const args: Record<string, unknown> = {};
    for (let p = paramRe.exec(m[2]); p; p = paramRe.exec(m[2])) {
      args[p[1]] = coerce(p[2].trim());
    }
    calls.push({ id: `inline_${calls.length}`, name: m[1], arguments: JSON.stringify(args) });
  }

  const text = norm
    .replace(/<\/?tool_calls>/gi, "")
    .replace(invokeRe, "")
    .trim();
  return { calls, text };
}

/** Parameter bodies arrive as raw text; JSON payloads must not stay strings. */
function coerce(raw: string): unknown {
  if (/^[[{]/.test(raw)) {
    try { return JSON.parse(raw); } catch { /* keep as text */ }
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

/** One tool-calling step: returns the model's text and any tool calls it made. */
export async function chatWithTools(
  messages: AgentMessage[],
  tools: ToolDef[],
  opts: Omit<AskOptions, "system"> = {},
): Promise<ToolTurn> {
  const msg = await callOpenRouter({
    model: opts.model ?? (await resolveModel(opts.task ?? "default")),
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    tools: tools.map((t) => ({ type: "function", function: t })),
    tool_choice: "auto",
  });
  const toolCalls: ToolCall[] = (msg.tool_calls ?? [])
    .filter((c) => c.function?.name)
    .map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments || "{}" }));

  const content = (msg.content ?? "").trim();
  // Nothing native, but the text looks like a tool call: rescue it rather than
  // showing the markup to the user.
  if (!toolCalls.length) {
    const inline = parseInlineToolCalls(content);
    if (inline.calls.length) {
      return {
        content: inline.text,
        toolCalls: inline.calls,
        raw: {
          role: "assistant",
          content: inline.text,
          tool_calls: inline.calls.map((c) => ({
            id: c.id,
            type: "function",
            function: { name: c.name, arguments: c.arguments },
          })),
        },
      };
    }
  }

  return {
    content,
    toolCalls,
    raw: { role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls },
  };
}

/** Whether an error from the API suggests the model can't do tool-calling. */
export function isToolUnsupportedError(e: unknown): boolean {
  return /tool|function[_ ]?call/i.test((e as Error)?.message ?? "");
}
