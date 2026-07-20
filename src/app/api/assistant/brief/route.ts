import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, askAI } from "@/lib/ai";
import { collectContext, todayISO } from "@/lib/aggregate";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Owner-only "morning brief": takes the compact aggregated snapshot and asks the
 * model to prioritize what needs attention today. Cached server-side.
 */

const TTL = 30 * 60 * 1000; // 30 min
let cache: { at: number; data: unknown } | null = null;

const SYSTEM = `Ты — личный ассистент-секретарь. На вход даётся сводка из задач, календаря, Bitrix, Telegram, почты и свежих новостей (GitHub-тренды, тех, AI) владельца.
Твоя задача — кратко и по делу сказать, на что обратить внимание СЕГОДНЯ. Правила:
- Пиши на русском, живо, без воды и без markdown-заголовков.
- Сначала 1–2 предложения общей картины.
- Затем список "Приоритеты:" из 3–6 пунктов, самое срочное сверху (просрочки, дедлайны сегодня, ждущие ответа люди).
- Если что-то ждёт ответа в почте/Telegram — так и скажи.
- Не выдумывай того, чего нет в данных. Если данных мало — так и напиши.`;

export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ ...(cache.data as object), cached: true });
  }

  try {
    const context = await collectContext();
    if (!context.trim()) {
      const data = { brief: "Пока нет данных для брифинга — подключи задачи, календарь, Bitrix, Telegram или почту.", generatedAt: new Date().toISOString() };
      cache = { at: Date.now(), data };
      return NextResponse.json(data);
    }
    // 600 токенов не хватало reasoning-моделям: рассуждение съедало бюджет и
    // ответ приходил пустым. Брифинг короткий, запас лишним не будет.
    const brief = await askAI(`Вот сводка на ${todayISO()}:\n\n${context}`, { task: "brief", system: SYSTEM, maxTokens: 1500 });
    const data = { brief, generatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e) {
    // Брифинг — не критичный экран: лучше показать прошлый (пусть протухший),
    // чем 502. Свежесть видно по generatedAt, а `stale` включает пометку в UI.
    if (cache) return NextResponse.json({ ...(cache.data as object), cached: true, stale: true });
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
