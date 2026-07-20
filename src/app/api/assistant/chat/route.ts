import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { runAssistant, buildAssistantSystem } from "@/lib/assistant-agent";
import { collectContext, todayISO } from "@/lib/aggregate";
import {
  parseTgReads,
  buildTgContext,
  parseNotionReads,
  buildNotionContext,
  buildNotionAutoContext,
  parseUserTaskCommands,
  parseAiTaskBlocks,
  stripAiTaskBlocks,
  createAssistantTasks,
} from "@/lib/assistant-tools";

export const runtime = "nodejs";
// Развёрнутые ответы и цепочки инструментов не укладывались в 60с — берём
// столько же, сколько у telegram-бота (максимум Fluid).
export const maxDuration = 300;

const bodySchema = z.object({
  // 32k на реплику: длинные ответы ассистента возвращаются сюда же в истории,
  // и при лимите 8000 следующий запрос падал бы с «invalid body».
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(32000) })).min(1).max(20),
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

    const notionQueries = parseNotionReads(userText);
    const notionPageContext = notionQueries.length ? await buildNotionContext(notionQueries) : "";
    const notionAutoContext = await buildNotionAutoContext(userText, notionQueries);

    const context = await collectContext();
    const extra = [tgContext, notionPageContext, notionAutoContext, userTaskNotes.length ? "СОЗДАННЫЕ ЗАДАЧИ (команды пользователя):\n" + userTaskNotes.join("\n") : ""]
      .filter(Boolean)
      .join("\n\n");

    const system = buildAssistantSystem(todayISO(), context, extra);

    const result = await runAssistant(system, parsed.data.messages);
    let answer = result.answer;

    // Fallback for a model that can't call tools: honour [[task:…]] blocks.
    const aiTasks = parseAiTaskBlocks(answer);
    const aiTaskNotes = aiTasks.length ? await createAssistantTasks(aiTasks) : [];
    answer = stripAiTaskBlocks(answer);

    const taskNotes = [...userTaskNotes, ...aiTaskNotes];
    if (taskNotes.length) {
      answer = `${answer.trim()}\n\n---\n${taskNotes.join("\n")}`.trim();
    }

    return NextResponse.json({ answer, tasksCreated: taskNotes.length, actions: result.actions });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
