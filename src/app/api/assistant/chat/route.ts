import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { aiConfigured, chatAI, type AiMessage } from "@/lib/ai";
import { collectContext, todayISO } from "@/lib/aggregate";
import {
  parseTgReads,
  buildTgContext,
  parseUserTaskCommands,
  parseAiTaskBlocks,
  stripAiTaskBlocks,
  createAssistantTasks,
} from "@/lib/assistant-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(20),
});

export async function POST(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI не настроен (OPENROUTER_API_KEY)" }, { status: 503 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
    const userText = lastUser?.content ?? "";

    const userTasks = parseUserTaskCommands(userText);
    const userTaskNotes = userTasks.length ? await createAssistantTasks(userTasks) : [];

    const tgSpecs = parseTgReads(userText);
    const tgContext = tgSpecs.length ? await buildTgContext(tgSpecs) : "";

    const context = await collectContext();
    const extra = [tgContext, userTaskNotes.length ? "СОЗДАННЫЕ ЗАДАЧИ (команды пользователя):\n" + userTaskNotes.join("\n") : ""]
      .filter(Boolean)
      .join("\n\n");

    const system = `Ты — личный ассистент владельца рабочего кабинета. Сегодня ${todayISO()}.
Тебе доступна актуальная сводка из его задач, календаря, Bitrix, Notion, Telegram, почты и свежих новостей (GitHub-тренды, тех и AI) — ниже.
Если пользователь указал @ИмяЧата N или /tg ИмяЧата N — тебе подгружают последние N сообщений этого чата (см. блок TELEGRAM).
Отвечай на её основе: кратко, по делу, на русском. Если в данных нет ответа — честно скажи, не выдумывай.
Можешь связывать источники (например, письмо и задачу от того же человека) и подсказывать приоритеты.

Создание задач: если пользователь просит завести задачу — добавь в конец ответа отдельной строкой:
[[task:high]] Название задачи
Приоритет: none | low | medium | high. Можно несколько строк. Не дублируй задачи, которые уже созданы командами /task.

=== АКТУАЛЬНЫЕ ДАННЫЕ ===
${context || "(пока пусто — источники не подключены или нет свежих данных)"}
${extra ? `\n\n=== ДОПОЛНИТЕЛЬНО ===\n${extra}` : ""}
=== КОНЕЦ ДАННЫХ ===`;

    const messages: AiMessage[] = [{ role: "system", content: system }, ...parsed.data.messages];
    const maxTokens = tgContext ? 1400 : 800;
    let answer = await chatAI(messages, { maxTokens });

    const aiTasks = parseAiTaskBlocks(answer);
    const aiTaskNotes = aiTasks.length ? await createAssistantTasks(aiTasks) : [];
    answer = stripAiTaskBlocks(answer);

    const taskNotes = [...userTaskNotes, ...aiTaskNotes];
    if (taskNotes.length) {
      answer = `${answer.trim()}\n\n---\n${taskNotes.join("\n")}`.trim();
    }

    return NextResponse.json({ answer, tasksCreated: taskNotes.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
