import { BIO } from "@/lib/bio";

export const runtime = "nodejs";
// Allow streamed answers from slow free models to finish (Vercel caps Hobby otherwise).
export const maxDuration = 60;

// Soft anti-abuse: best-effort in-memory throttle per IP. Generous on purpose —
// the model is free, so this only stops spam / runaway loops, not normal use.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30; // requests per window per IP
const hits = new Map<string, number[]>();

function rateLimited(req: Request): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory guard for long-lived instances
  return recent.length > RL_MAX;
}

// Default to a FAST free model — Ultra 550B is too slow/queued on the free tier (~28s).
// The UI can override per-request via body.model (Fast / Balanced / Max).
const MODEL = process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
}

// If the model produces no token within this window, fall back to a fast local answer.
const FIRST_TOKEN_TIMEOUT_MS = 18000;

const encoder = new TextEncoder();

/** Quick diagnostic: GET /api/chat → is the key configured and which model. */
export async function GET() {
  return Response.json({
    configured: !!process.env.OPENROUTER_API_KEY,
    model: MODEL,
    hint: process.env.OPENROUTER_API_KEY
      ? "Key loaded. Если не отвечает — включи бесплатные модели на openrouter.ai/settings/privacy."
      : "Нет OPENROUTER_API_KEY в окружении. Добавь в .env.local и ПЕРЕЗАПУСТИ dev-сервер.",
  });
}

export async function POST(req: Request) {
  let body: { messages?: Msg[]; mode?: "portfolio" | "web"; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  if (rateLimited(req)) {
    return streamText(
      "Слишком много запросов подряд 🙂 Подожди минутку и спроси снова — ассистент на бесплатной модели, берегу его от спама."
    );
  }

  const messages = (body.messages ?? []).slice(-12);
  const mode = body.mode === "web" ? "web" : "portfolio";
  const key = process.env.OPENROUTER_API_KEY;
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // ---- No API key: local keyword fallback so the demo still works ----
  if (!key) {
    return streamText(localAnswer(lastUser, mode));
  }

  // ---- Real model via OpenRouter (streaming) ----
  const system: Msg = {
    role: "system",
    content:
      mode === "web"
        ? "Ты — полезный ассистент на сайте-портфолио Владимира. Отвечай кратко и по делу на языке вопроса. У тебя есть доступ к интернету — используй его для актуальных фактов."
        : BIO,
  };
  const baseModel = body.model || MODEL;
  const model = mode === "web" ? `${baseModel}:online` : baseModel;

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://portfolio.vladimir.dev",
        "X-Title": "Vladimir Portfolio",
      },
      body: JSON.stringify({
        model,
        messages: [system, ...messages],
        stream: true,
        // suppress chain-of-thought so the answer streams immediately
        reasoning: { exclude: true },
        // prefer the fastest provider for this model
        provider: { sort: "throughput" },
      }),
    });
  } catch {
    return streamText("⚠️ Не удалось подключиться к модели. Попробуйте позже или напишите напрямую: bigboyvova01@gmail.com");
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    let hint = "";
    if (upstream.status === 404 && /data policy|no endpoints/i.test(detail))
      hint = " → Включи доступ к бесплатным моделям: openrouter.ai/settings/privacy.";
    else if (upstream.status === 429) hint = " → Лимит бесплатной модели исчерпан, попробуй позже.";
    else if (upstream.status === 401) hint = " → Неверный OPENROUTER_API_KEY.";
    return streamText(`⚠️ Модель недоступна (${upstream.status}).${hint} ${detail.slice(0, 140)}`);
  }

  // Re-emit only the text deltas from the SSE stream as plain text.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let emitted = false;
      let closed = false;

      // watchdog: if the (free/queued) model is silent too long, serve a local answer
      const watchdog = setTimeout(() => {
        if (emitted || closed) return;
        closed = true;
        controller.enqueue(
          encoder.encode(
            "⏳ Модель отвечает медленно (бесплатный тариф перегружен). Пока коротко по делу:\n\n" +
              localAnswer(lastUser, mode)
          )
        );
        controller.close();
        reader.cancel().catch(() => {});
      }, FIRST_TOKEN_TIMEOUT_MS);

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (closed) return;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const data = t.slice(5).trim();
            if (data === "[DONE]") {
              clearTimeout(watchdog);
              if (!emitted && !closed)
                controller.enqueue(encoder.encode("🤔 Модель не вернула ответ. Попробуй ещё раз."));
              if (!closed) controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const choice = json.choices?.[0];
              const delta = choice?.delta?.content ?? choice?.message?.content;
              if (json.error) {
                controller.enqueue(encoder.encode(`⚠️ ${json.error.message ?? "ошибка модели"}`));
                emitted = true;
              } else if (delta) {
                if (!emitted) clearTimeout(watchdog);
                controller.enqueue(encoder.encode(delta));
                emitted = true;
              }
            } catch {
              /* keep partial line in buffer */
            }
          }
        }
      } catch {
        /* stream aborted */
      } finally {
        clearTimeout(watchdog);
        if (!closed) controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

function streamText(text: string) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // emit in small chunks for a typewriter feel
      const words = text.split(/(\s+)/);
      let i = 0;
      const id = setInterval(() => {
        if (i >= words.length) {
          clearInterval(id);
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(words[i++]));
      }, 16);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

function localAnswer(q: string, mode: string): string {
  if (mode === "web")
    return "🌐 Веб-режим требует API-ключ OpenRouter (переменная OPENROUTER_API_KEY). Добавьте ключ — и я смогу искать в интернете. Пока могу отвечать про Владимира в режиме «Portfolio».";

  const s = q.toLowerCase();
  const has = (...k: string[]) => k.some((w) => s.includes(w));

  if (has("go", "голанг", "golang"))
    return "Да, Владимир пишет на Go: локальные агенты сбора метрик (WiFi Analyzer, PC Health Monitor) на gopsutil и gorilla/websocket, горутины, кросс-компиляция под Windows/Linux, чистые парсеры с тестами. Открой projects/wifi-analyzer.go.";
  if (has("realtime", "websocket", "сокет", "реалтайм"))
    return "Realtime — сильная сторона: WebSocket с авто-реконнектом (exponential backoff), мультиплексирование потоков по одному сокету, один poll-loop раздаёт снапшоты многим клиентам. Примеры — projects/vortan-crypto.tsx и live/market.live.tsx (живые цены Binance).";
  if (has("ai", "ии", "llm", "rag", "agent", "агент"))
    return "AI — основной фокус сейчас: Multi-Agent Arena (цепочки агентов, RAG, аналитика), интеграция LLM через OpenRouter и Claude API. Этот самый чат — тоже его рук дело :)";
  if (has("react", "next", "frontend", "фронт", "typescript", "ts"))
    return "Фронтенд — база Владимира: React 18/19 + TypeScript strict, Next.js (App Router), Angular 19, Vue 3, продвинутый UX (⌘K, виртуальный скролл, потоковый UI). Весь этот сайт — Next.js + TS.";
  if (has("опыт", "experience", "работал", "стартап", "vortan"))
    return "2+ года: стартап Vortan (крипто, core-команда, прошли во 2-й этап Google-акселератора), HR-tech стажировка (React+NestJS+OpenSearch), Telegram-боты, браузерные расширения. Подробно — в папке experience/.";
  if (has("контакт", "связ", "нанять", "hire", "email", "почта", "telegram"))
    return "Связаться: email bigboyvova01@gmail.com или GitHub github.com/YpCIIIaK. На сайте есть рабочая форма — открой contact/contact.tsx.";
  if (has("проект", "project", "портфолио"))
    return "Топ-проекты: WiFi Analyzer и PC Health Monitor (Go-агенты), Repo Anti-Rot (17 сканеров, CLI+Action+дашборд), Multi-Agent Arena (ИИ), Vortan (крипто-трейдинг). Папка projects/ + живые данные в live/.";
  if (has("ccusage", "claude code", "openrouter", "сколько потрат", "какие модел", "использует ии", "usage", "токен"))
    return "Владимир активно использует ИИ в работе: Claude Code (агент Anthropic, в основном Opus 4.8) и OpenRouter (десятки моделей через один API). Реальная статистика — в файле meta/ai-usage.json: Claude Code ~$729 / ~849M токенов, OpenRouter ~$18 / ~282M токенов по 42 моделям.";
  return "Я расскажу про навыки и проекты Владимира. Спросите, например: «Знает ли он Go?», «Покажи realtime-опыт», «Какой опыт с AI?». (Для полноценного ИИ-режима с интернетом нужен ключ OpenRouter.)";
}
