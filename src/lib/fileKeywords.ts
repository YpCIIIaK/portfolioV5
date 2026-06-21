import { allFiles } from "./files";

/**
 * Curated RU+EN keyword → fileId relevance map.
 * Lets the AI assistant "open" the file most related to a question.
 */
const KEYWORDS: Record<string, string[]> = {
  "projects/wifi-analyzer.go": [
    "go", "golang", "голанг", "wifi", "wi-fi", "вайфай", "сеть", "сети", "network",
    "приватн", "privacy", "netsh", "nmcli", "трафик", "agent", "агент",
  ],
  "projects/pc-health-monitor.go": [
    "go", "golang", "голанг", "монитор", "monitor", "cpu", "процесс", "майнер",
    "температур", "троттл", "здоровь", "health", "метрик", "gopsutil",
  ],
  "projects/repo-anti-rot.ts": [
    "security", "безопас", "секрет", "secret", "scanner", "скан", "анти", "rot",
    "репозитор", "качеств", "sarif", "cli", "github action", "уязвим", "lint",
  ],
  "projects/multi-agent-arena.ts": [
    "ai", "ии", "llm", "rag", "агент", "agent", "арена", "arena", "нейросет",
    "мультиаг", "multi-agent", "цепочк", "openrouter",
  ],
  "projects/vortan-crypto.tsx": [
    "крипт", "crypto", "vortan", "вортан", "трейд", "trade", "бинанс", "binance",
    "стартап", "startup", "бэктест", "стратег", "realtime", "websocket", "сокет",
    "реалтайм", "rxjs", "акселератор", "google",
  ],
  "projects/chrome-extensions-suite.tsx": [
    "расширен", "extension", "chrome", "хром", "mv3", "сюита", "suite", "монорепо",
    "privacy", "приватн", "фингерпринт", "fingerprint", "трекер", "tracker",
    "tabresurrect", "вкладк", "tab", "память", "ram", "discard", "chat skins",
    "скин", "skins", "кастомизац", "shadow dom", "селектор", "selector",
    "declarativenetrequest", "telegram web", "whatsapp",
  ],
  "projects/repo-visualizer.tsx": [
    "визуализ", "visual", "граф", "graph", "структур", "structure", "github api",
  ],
  "experience/hr-search-platform.md": [
    "hr", "поиск", "search", "opensearch", "кандидат", "nestjs", "стажир",
    "стаж", "опыт работ", "227", "backfill",
  ],
  "experience/telegram-bots.md": [
    "telegram", "телеграм", "бот", "bots", "php", "python", "отчётн", "yourtar",
  ],
  "experience/browser-extensions.md": [
    "расширен", "extension", "chrome", "хром", "браузер", "browser", "tradernet",
    "manifest", "mv3", "vortan", "вортан", "binance", "бинанс", "overlay", "оверлей",
    "боллиндж", "bollinger", "тренд", "trend", "риск", "risk", "supabase", "supabase",
    "контент-скрипт", "content script", "pagehook", "перехват",
  ],
  "live/github.stats.tsx": [
    "github", "гитхаб", "звезд", "star", "статист", "репозитор", "профил",
  ],
  "live/contributions.tsx": [
    "контриб", "contribution", "коммит", "commit", "активн", "сетк", "heatmap",
    "календар", "за год",
  ],
  "live/market.live.tsx": [
    "рынок", "market", "цен", "price", "тикер", "ticker", "btc", "биткоин",
    "eth", "котировк",
  ],
  "about/skills.json": [
    "навык", "skill", "стек", "stack", "технолог", "умеет", "знает ли",
    "владеет", "инструмент",
  ],
  "about/about.md": [
    "о себе", "about", "кто он", "кто такой", "образован", "астан", "хобби",
    "личн", "спорт", "где живёт",
  ],
  "contact/contact.tsx": [
    "контакт", "contact", "связ", "нанять", "hire", "найм", "email", "почта",
    "написать", "вакансия", "оффер", "резюме",
  ],
  ".vscode/settings.json": [
    "настройк", "settings", "тема", "theme", "шрифт", "font", "конфиг",
    "config", "кастомиз", "customize", "изменить вид",
  ],
  "meta/ai-usage.json": [
    "ccusage", "claude code", "claude-code", "openrouter", "опенроутер",
    "потрат", "расход", "стоимост", "токен", "token", "usage", "использован",
    "модел", "model", "ии", " ai ", "сколько потратил", "статистик",
  ],
  "README.md": ["readme", "обзор", "overview", "интро", "intro"],
};

/** Returns up to `limit` file ids most relevant to the given text, best first. */
export function relevantFiles(text: string, limit = 3): string[] {
  const s = text.toLowerCase();
  const scored: { id: string; score: number }[] = [];

  for (const [id, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) if (s.includes(w)) score += 1;
    // an explicit path / filename mention is a strong signal
    const name = id.split("/").pop()!.toLowerCase();
    if (s.includes(id.toLowerCase())) score += 3;
    else if (name.length > 4 && s.includes(name)) score += 2;
    if (score > 0) scored.push({ id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((x) => allFiles.some((f) => f.id === x.id))
    .slice(0, limit)
    .map((x) => x.id);
}
