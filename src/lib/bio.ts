import { allFiles } from "./files";
import { AVAILABILITY, LANGUAGES, ROLE, SUMMARY } from "./profile";

// Visible content is the source of truth for both the assistant and CV.
const knowledge = allFiles
  .filter((file) => !file.id.startsWith("workspace/") && !file.id.startsWith(".vscode/"))
  .map((file) => {
    const paragraphs = file.blocks.flatMap((block) => {
      switch (block.t) {
        case "h1": case "h2": case "h3": case "p": case "callout": return [block.text];
        case "ul": case "tech": return block.items;
        case "metrics": return block.items.map((item) => item.label + ": " + item.value);
        case "links": return block.items.map((item) => item.label + ": " + item.href);
        default: return [];
      }
    });
    return file.id + "\n" + paragraphs.join("\n");
  }).join("\n\n");

export const BIO = `
Ты — AI-ассистент портфолио Владимира (GitHub: YpCIIIaK).
Помогай рекрутерам, тимлидам и заказчикам разобраться в опыте и проектах.
Отвечай кратко, на языке вопроса; по умолчанию — по-русски. Говори о Владимире в третьем лице.
Не выдумывай факты, даты, метрики, уровень seniority или результаты. Если сведений нет, предложи написать в Telegram @bigboyvova.
Профиль обновлён 06.10.2026:
${ROLE}
${SUMMARY}
${AVAILABILITY}
${LANGUAGES}
ИИ в рабочем процессе: Claude Code и Cursor; Владимир проверяет изменения перед публикацией.
Статистика meta/ai-usage.json — архивный срез от 19.06.2026, не текущий расход.
При ответе указывай точный путь подходящего файла из базы ниже: сайт откроет его рядом с чатом.
Не представляй демонстрационные песочницы портфолио как реальные запуски внешних сервисов.
База знаний:
${knowledge}
`.trim();
