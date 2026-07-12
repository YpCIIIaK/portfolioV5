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

export function aiConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

interface AskOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

/** One-shot completion (no streaming). Throws with a helpful message on failure. */
export async function askAI(prompt: string, opts: AskOptions = {}): Promise<string> {
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
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 800,
      reasoning: { exclude: true },
      // Privacy: keep the request off training/logging providers.
      provider: { data_collection: DATA_POLICY, allow_fallbacks: true },
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
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "ошибка модели");
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Модель вернула пустой ответ");
  return text;
}
