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
 */

const MODEL = process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
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
      model: MODEL,
      reasoning: { exclude: true },
      // Privacy: keep the request off training/logging providers.
      provider: { data_collection: DATA_POLICY, allow_fallbacks: true },
      ...body,
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

  for (const attempt of [0, 1]) {
    const msg = await callOpenRouter({
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

/** One tool-calling step: returns the model's text and any tool calls it made. */
export async function chatWithTools(
  messages: AgentMessage[],
  tools: ToolDef[],
  opts: Omit<AskOptions, "system"> = {},
): Promise<ToolTurn> {
  const msg = await callOpenRouter({
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    tools: tools.map((t) => ({ type: "function", function: t })),
    tool_choice: "auto",
  });
  const toolCalls: ToolCall[] = (msg.tool_calls ?? [])
    .filter((c) => c.function?.name)
    .map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments || "{}" }));
  return {
    content: (msg.content ?? "").trim(),
    toolCalls,
    raw: { role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls },
  };
}

/** Whether an error from the API suggests the model can't do tool-calling. */
export function isToolUnsupportedError(e: unknown): boolean {
  return /tool|function[_ ]?call/i.test((e as Error)?.message ?? "");
}
