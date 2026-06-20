import type { FolderNode, FileNode, TreeNode } from "./types";

export const GITHUB = "https://github.com/YpCIIIaK";

/* ------------------------------------------------------------------ */
/*  FILE CONTENT                                                       */
/* ------------------------------------------------------------------ */

const readme: FileNode = {
  id: "README.md",
  name: "README.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "👋 Vladimir — Fullstack Developer" },
    {
      t: "p",
      text: "Фронтенд, выросший в фуллстек. Делаю интерфейсы, которые не бесят, и бэкенд, который их кормит данными в реальном времени. 2+ года в пет-проектах, двух стартапах и коммерческой разработке.",
    },
    { t: "callout", text: "Совет: это VSCode. Открывай файлы слева, жми ⌘K / Ctrl+K для палитры команд, и попробуй терминал внизу — он живой." },
    { t: "h2", text: "Чем занимаюсь" },
    {
      t: "ul",
      items: [
        "Frontend: React 18/19, TypeScript (strict), Next.js, Angular 19, Vue 3",
        "Backend: Go (агенты сбора метрик), Node.js, PHP/Symfony, Python",
        "Realtime: WebSocket с авто-реконнектом, мультиплексирование потоков",
        "AI: интеграция LLM через OpenRouter / Claude API, RAG, мультиагентные системы",
      ],
    },
    { t: "tech", items: ["TypeScript", "React", "Next.js", "Go", "Node.js", "Angular", "PHP/Symfony", "Python", "Docker"] },
    {
      t: "links",
      items: [
        { label: "GitHub", href: GITHUB },
        { label: "repo-anti-rot", href: GITHUB + "/Hephaestus" },
        { label: "wifi-analyzer", href: GITHUB + "/wifi-analyse-full" },
      ],
    },
  ],
};

const about: FileNode = {
  id: "about/about.md",
  name: "about.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "О себе" },
    {
      t: "p",
      text: "Меня зовут Владимир. Базируюсь в Астане, открыт к удалёнке. Комфортно работаю и с визуальной частью (вёрстка, компоненты, состояния, анимации), и с логикой (API, агенты на Go, боты, интеграция ИИ).",
    },
    {
      t: "p",
      text: "Больше всего нравится создавать проекты, где есть веб-интерфейс и «живое» взаимодействие пользователя с данными и ИИ. Люблю быстро выводить фичи в прод и улучшать их по фидбеку.",
    },
    { t: "h2", text: "Путь" },
    {
      t: "ul",
      items: [
        "Старт с фронтенда: сложные SPA, дизайн-системы на токенах, продвинутый UX",
        "Рост в realtime и данные: WebSocket-слой, нормализация и визуализация метрик",
        "Переход в бэкенд: Go-агенты сбора системных метрик, чистые парсеры, конкурентность",
        "AI-инженерия: мультиагентные системы, RAG, аналитика использования ИИ",
      ],
    },
    { t: "h2", text: "Личное" },
    { t: "p", text: "Спорт: баскетбол, фитнес, горные лыжи, коньки/ролики, плавание и водное поло." },
    { t: "divider" },
    { t: "p", text: "Образование: «Программная инженерия», ТУСУР (ожидаемое окончание 2028). Также стипендиальные IT-программы в ТГУ и AITU." },
  ],
};

const skills: FileNode = {
  id: "about/skills.json",
  name: "skills.json",
  language: "JSON",
  blocks: [
    { t: "h1", text: "Технический стек" },
    {
      t: "code",
      lang: "json",
      code: `{
  "frontend": {
    "languages": ["TypeScript 5.x (strict)", "JavaScript ES6+"],
    "frameworks": ["React 18/19", "Next.js (App Router)", "Angular 19", "Vue 3"],
    "state": ["Redux Toolkit", "Angular Signals", "RxJS 7", "useSyncExternalStore"],
    "styling": ["Tailwind CSS", "SCSS / CSS Modules", "design tokens"],
    "ux": ["⌘K command palette", "virtual scroll", "streaming UI", "dark/light themes"]
  },
  "backend": {
    "go": ["gopsutil", "gorilla/websocket", "goroutines", "cross-compile win/linux"],
    "node": ["commander CLI", "zod", "tsup", "@babel/parser", "simple-git"],
    "php": ["Symfony 8", "Doctrine ORM 3.6", "REST", "webhooks"],
    "python": ["боты", "автоматизация", "торговые инструменты"]
  },
  "realtime": ["WebSocket auto-reconnect", "exponential backoff", "multiplexed streams"],
  "ai": ["OpenRouter", "Claude API", "RAG", "multi-agent chains"],
  "infra": ["Docker", "GitHub Actions", "custom GitHub Action + SARIF", "pnpm workspaces"]
}`,
    },
  ],
};

const wifi: FileNode = {
  id: "projects/wifi-analyzer.go",
  name: "wifi-analyzer.go",
  language: "Go",
  blocks: [
    { t: "h1", text: "WiFi Analyzer" },
    { t: "p", text: "Privacy-first инструмент: в реальном времени анализирует Wi-Fi-окружение и сетевую активность машины. Все данные остаются локально — ничего не уходит в облако." },
    {
      t: "metrics",
      items: [
        { label: "Архитектура", value: "Go-агент + React-дашборд по WebSocket" },
        { label: "Платформы", value: "Windows / Linux одним кодом" },
        { label: "Тесты", value: "Go-фикстуры + Vitest, CI на GitHub Actions" },
      ],
    },
    { t: "h2", text: "Проблема" },
    { t: "p", text: "Классические speedtest-сервисы ничего не говорят о том, какой канал свободнее, куда реально уходит трафик и не «прилип» ли ноут к слабой точке. А подобные данные нельзя сливать в облако — это приватность." },
    { t: "h2", text: "Решение" },
    {
      t: "ul",
      items: [
        "Кросс-платформенный Go-агент: netsh (Windows), nmcli/ss (Linux) — парсеры понимают EN+RU локали",
        "Один общий poll-loop раздаёт снапшоты всем клиентам: N подключений ≠ N системных вызовов",
        "Карта мира соединений на d3-geo + офлайн-геолокация по локальной .mmdb (без внешних сервисов)",
        "Детекторы безопасности: evil-twin, открытые сети, выход процесса в новую страну",
        "Origin/CORS-фильтр только на localhost — чтобы сторонний сайт не прочитал список процессов",
      ],
    },
    { t: "h3", text: "Ключевой код — fan-out снапшотов многим клиентам" },
    {
      t: "code",
      lang: "go",
      collapsible: true,
      caption: "Один замер раздаётся всем подписчикам через буферизованные очереди — медленный клиент не блокирует остальных.",
      code: `// broadcast пушит снапшот всем клиентам без блокировки общего loop'а.
func (h *Hub) broadcast(snap Snapshot) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    for c := range h.clients {
        select {
        case c.send <- snap:           // влезло в буфер клиента — ок
        default:                       // клиент не успевает читать —
            // дропаем кадр для него, но не тормозим остальных
            atomic.AddUint64(&c.dropped, 1)
        }
    }
}

// pollLoop — единственный источник системных вызовов.
func (h *Hub) pollLoop(ctx context.Context, every time.Duration) {
    t := time.NewTicker(every)
    defer t.Stop()
    for {
        select {
        case <-ctx.Done():
            return
        case <-t.C:
            snap := h.collect()       // один замер
            h.broadcast(snap)         // на N клиентов
        }
    }
}`,
    },
    { t: "tech", items: ["Go", "gorilla/websocket", "gopsutil", "d3-geo", "React", "Vitest", "GitHub Actions"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/wifi-analyse-full" }] },
  ],
};

const pcHealth: FileNode = {
  id: "projects/pc-health-monitor.go",
  name: "pc-health-monitor.go",
  language: "Go",
  blocks: [
    { t: "h1", text: "PC Health Monitor" },
    { t: "p", text: "Локальный монитор «здоровья» ПК: в реальном времени отслеживает нагрузку и учится ловить неестественную активность — скрытые майнеры, перегрев, троттлинг, деградацию диска. Активная разработка." },
    {
      t: "metrics",
      items: [
        { label: "Агент", value: "Go + gopsutil, без cgo" },
        { label: "Дашборд", value: "React + Vite + собственный UI-kit" },
        { label: "История", value: "кольцевой буфер ~24ч + JSONL с ротацией" },
      ],
    },
    { t: "h2", text: "Инженерная деталь, которой горжусь" },
    { t: "p", text: "Мгновенный CPU% на процесс библиотека «из коробки» считает как среднее за всю жизнь процесса — это бесполезно для детекта внезапной нагрузки. Я считаю его вручную как дельту cumulative-CPU-time между опросами, делённую на число ядер." },
    {
      t: "code",
      lang: "go",
      collapsible: true,
      caption: "Дельта CPU-времени между двумя опросами → реальная мгновенная загрузка процесса.",
      code: `// instantCPU = (Δ cpu_time процесса) / (Δ wall_time * numCPU) * 100
func instantCPU(prev, cur procSample, numCPU int) float64 {
    dt := cur.at.Sub(prev.at).Seconds()
    if dt <= 0 {
        return 0
    }
    dCPU := (cur.userTime + cur.sysTime) - (prev.userTime + prev.sysTime)
    pct := (dCPU / dt) / float64(numCPU) * 100
    return math.Max(0, pct)
}`,
    },
    { t: "h2", text: "Дальше по плану" },
    { t: "ul", items: ["Мост к LibreHardwareMonitor/nvidia-smi (температуры, GPU)", "SMART через smartctl", "Эвристический детектор аномалий", "Опциональный AI-анализ находок через Claude API (явный opt-in, ключ только на агенте)"] },
    { t: "tech", items: ["Go", "gopsutil", "WebSocket", "React", "Vite", "Tailwind"] },
  ],
};

const repoAntiRot: FileNode = {
  id: "projects/repo-anti-rot.ts",
  name: "repo-anti-rot.ts",
  language: "TypeScript",
  blocks: [
    { t: "h1", text: "Repo Anti-Rot" },
    { t: "p", text: "Платформа, которая автоматически оценивает «здоровье» git-репозитория и отслеживает его деградацию во времени. Один движок — три обёртки: CLI, GitHub Action и веб-дашборд на Next.js." },
    {
      t: "metrics",
      items: [
        { label: "Сканеры", value: "17 полиглот-сканеров" },
        { label: "Тесты", value: "~237 unit-тестов (Vitest)" },
        { label: "Оценка", value: "0–100 балл + грейд A–F" },
      ],
    },
    { t: "h2", text: "Что проверяет" },
    { t: "ul", items: ["Утёкшие секреты (с редактированием улик до отправки)", "Уязвимые/заброшенные зависимости через OSV / npm / PyPI", "Мёртвый код для JS/TS/Python/Go, TODO-долг, env-переменные", "Стейл-ветки, bus-factor, hygiene Dockerfile/README/CI"] },
    { t: "h2", text: "Архитектура: один движок, три обёртки" },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "Расширяемый реестр сканеров: каждый — чистая функция, считающая взвешенный score. CLI / Action / дашборд переиспользуют один и тот же engine.",
      code: `interface Scanner {
  id: string;
  weight: number;
  run(ctx: RepoContext): Promise<Finding[]>;
}

const registry: Scanner[] = [
  secretsScanner, depsScanner, deadCodeScanner,
  todoDebtScanner, staleBranchScanner, busFactorScanner,
  /* …17 total */
];

export async function scan(ctx: RepoContext): Promise<Report> {
  const results = await Promise.all(
    registry.map(async (s) => ({ s, findings: await s.run(ctx) }))
  );
  const score = results.reduce(
    (acc, { s, findings }) => acc - penalty(findings) * s.weight,
    100
  );
  return { score: clamp(score, 0, 100), grade: toGrade(score), results };
}`,
    },
    { t: "p", text: "В дашборде: портфель репозиториев с трендами, AI-обогащение находок через same-origin прокси к OpenRouter (ключ только в localStorage), command palette (⌘K), расписание автосканов, score-drop webhook, экспорт в Markdown/CSV/JSON." },
    { t: "tech", items: ["TypeScript", "Next.js", "Node.js CLI", "GitHub Action", "SARIF", "Vitest", "OpenRouter"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/Hephaestus" }] },
  ],
};

const multiAgent: FileNode = {
  id: "projects/multi-agent-arena.ts",
  name: "multi-agent-arena.ts",
  language: "TypeScript",
  blocks: [
    { t: "h1", text: "Multi-Agent Arena" },
    { t: "callout", text: "Текущий основной проект — в активной разработке." },
    { t: "p", text: "«Арена» для взаимодействия разных ИИ-агентов: гибкая архитектура цепочек, визуальный конструктор сценариев без правок кода и глубокая аналитика использования ИИ." },
    { t: "h2", text: "Что внутри" },
    { t: "ul", items: ["Базовые агентские функции: RAG, контекст, thinking-подходы", "Многоуровневые агенты, собираемые в цепочки под тип задачи", "Визуальный конструктор цепочек (комбинируешь ИИ и скрипты в сложные сценарии)", "Аналитика: лог запросов, стоимость, ошибки, метрики эффективности агентов", "Режимы взаимодействия: дебаты, совместная работа, ответы по очереди", "Модуль симуляции политических/экономических событий с агентами в ролях"] },
    { t: "tech", items: ["TypeScript", "Next.js", "OpenRouter API", "RAG", "react-xflow"] },
  ],
};

const vortan: FileNode = {
  id: "projects/vortan-crypto.tsx",
  name: "vortan-crypto.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Vortan — крипто-инструменты и торговые боты" },
    { t: "callout", text: "Стартап, core-команда, 4+ месяца. Прошли во 2-й этап акселератора Google (ресурсы и серверные мощности на год)." },
    { t: "p", text: "Руковожу frontend- и частично fullstack-разработкой инструментов для криптоаналитики, конструкторов стратегий, бэктестинга и AI-ботов для трейдинга." },
    { t: "h2", text: "Моя зона" },
    { t: "ul", items: ["Веб-интерфейсы конструкторов стратегий, модулей бэктестинга, аналитики, управления ботами", "Визуализация результатов и UX-сценарии трейдера", "Backend: подключение к БД, API для исторических и live-данных рынка", "Realtime-слой: Binance WS/REST с авто-реконнектом"] },
    { t: "h3", text: "WebSocket с экспоненциальным backoff (RxJS)" },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "Авто-реконнект к Binance: при обрыве переподключаемся с растущей задержкой, не заваливая сервер.",
      code: `const prices$ = webSocket<MiniTicker[]>(BINANCE_WS).pipe(
  retry({
    delay: (_err, attempt) =>
      timer(Math.min(1000 * 2 ** attempt, 30_000)), // exp backoff, cap 30s
  }),
  map((arr) => normalize(arr)),
  distinctUntilChanged(sameSnapshot),
);`,
    },
    { t: "tech", items: ["React", "TypeScript", "RxJS 7", "Binance WS/REST", "Lightweight Charts", "Node.js"] },
  ],
};

const repoVis: FileNode = {
  id: "projects/repo-visualizer.tsx",
  name: "repo-visualizer.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Repository Visualizer" },
    { t: "p", text: "Приложение на Next.js для визуализации структуры репозитория в виде интерактивных графов и AI-анализа кода. Интеграция с GitHub API и OpenRouter." },
    { t: "ul", items: ["Разные глубины анализа: overview / structure / deep", "Выбор моделей ИИ", "Генерация отчётов по архитектуре, стеку и качеству кода", "Интерактивный граф структуры (react-xflow)"] },
    { t: "tech", items: ["Next.js", "TypeScript", "GitHub API", "OpenRouter", "react-xflow"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/repo-in-tree-visual" }] },
  ],
};

const hrSearch: FileNode = {
  id: "experience/hr-search-platform.md",
  name: "hr-search-platform.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "Поисковый движок по базе кандидатов (стажировка)" },
    { t: "p", text: "Роль: Backend / Search Engineer. HR-платформа для рекрутеров с полнотекстовым поиском по базе из 227k+ профилей кандидатов (импорт из LinkedIn-дампов). Работал с реальным продакшен-объёмом данных." },
    { t: "callout", text: "227 249 живых документов в OpenSearch 2.12 (форк Elasticsearch 7.10), PostgreSQL как источник истины. Не учебный датасет — настоящий прод-объём и настоящие «грязные» данные." },

    { t: "h2", text: "Что сделал" },

    { t: "h3", text: "🔍 Поисковый индекс и пайплайн данных" },
    { t: "ul", items: [
      "Развернул изолированную песочницу OpenSearch (как в проде), индекс на 227 249 реальных документов.",
      "Спроектировал маппинг полей под полнотекстовый поиск: анализаторы, разделение keyword vs text, edge-ngram автокомплит по навыкам / компаниям / должностям.",
    ] },

    { t: "h3", text: "⚡ Инкрементальная синхронизация Postgres → OpenSearch" },
    { t: "ul", items: [
      "Переписал синхронизатор с полного reindex на инкрементальный — два независимых курсора (created_at / updated_at) с watermark из самого индекса.",
      "Идемпотентный upsert по стабильному ключу (urn): повторный прогон не плодит дубли.",
      "Результат: синк больше не перечитывает всю базу на каждом запуске.",
    ] },

    { t: "h3", text: "🐛 Восстановление мёртвого фильтра по опыту" },
    { t: "p", text: "Фильтр по стажу не работал: totalExperience = 0 у всех записей. Сделал backfill (scroll + _bulk) из вложенного experience[].time; отработал грязные данные — съехавшие поля, длительность вместо дат. Фильтр по опыту стал функциональным." },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "Параллельная занятость не должна раздувать стаж. Сливаем пересекающиеся интервалы дат и считаем реально отработанные месяцы.",
      code: `function totalMonths(periods: { start: Date; end: Date }[]): number {
  const sorted = [...periods].sort((a, b) => +a.start - +b.start);
  const merged: { start: Date; end: Date }[] = [];

  for (const p of sorted) {
    const last = merged[merged.length - 1];
    if (last && p.start <= last.end) {
      last.end = new Date(Math.max(+last.end, +p.end)); // overlap → extend
    } else {
      merged.push({ ...p });
    }
  }
  return merged.reduce((acc, p) => acc + monthsBetween(p.start, p.end), 0);
}`,
    },

    { t: "h3", text: "📊 Оптимизация «непросмотренных кандидатов» (доказано бенчмарком)" },
    { t: "p", text: "Прод-баг: при >10k просмотренных кандидаты дублировались при прокрутке. Провёл нагрузочный бенчмарк 4 стратегий исключения на 227k (медиана 25 прогонов) и доказал замерами: exclude by _id ≈ exclude by field (выигрыша нет), а must_not деградирует линейно (36 мс + 2 МБ payload на 50k исключённых)." },
    { t: "ul", items: [
      "Корень исходного бага: from/size + сорт без уникального тай-брейкера.",
      "Решение: курсорная пагинация search_after со стабильным total-order сортом → плоский took ~7 мс на любой глубине и устранение дублей by design.",
    ] },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "search_after не зависит от глубины: курсор — это sort-значения предыдущей страницы, а уникальный тай-брейкер (urn) убирает дубли.",
      code: `const body = {
  size: 50,
  // стабильный total-order: score + уникальный тай-брейкер
  sort: [{ _score: "desc" }, { urn: "asc" }],
  query,
  ...(cursor && { search_after: cursor }), // [score, urn] прошлой страницы
};

const res = await os.search({ index, body });
const nextCursor = res.hits.hits.at(-1)?.sort; // курсор следующей страницы`,
    },

    { t: "h3", text: "🌍 Нормализация локаций" },
    { t: "p", text: "Спроектировал спеку нормализации city / country / region для загрузчика: longest-match, разбор омонимов." },

    { t: "h3", text: "🔐 Безопасное хранение фото (Backblaze B2)" },
    { t: "p", text: "Выдача аватаров через неугадываемый ключ (urn вместо последовательного id) — защита от перебора и массового скачивания фото." },

    {
      t: "metrics",
      items: [
        { label: "Документов в индексе", value: "227 249" },
        { label: "Пагинация на любой глубине", value: "~7 мс" },
        { label: "Стек", value: "OpenSearch 2.12, NestJS, Postgres" },
      ],
    },
    { t: "tech", items: ["OpenSearch / Elasticsearch", "Query DSL", "search_after", "маппинги и анализаторы", "ETL Postgres→индекс", "инкрементальный синк", "нагрузочный бенчмаркинг", "TypeScript", "NestJS", "Docker"] },
  ],
};

const tgBots: FileNode = {
  id: "experience/telegram-bots.md",
  name: "telegram-bots.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "Telegram-боты — ООО «YourTar»" },
    { t: "p", text: "~6 месяцев, PHP/Python. Боты для системы отчётности офлайн-магазина, онлайн-школы психологии и учёта абонементов спортзала." },
    { t: "ul", items: ["Пользовательские сценарии, админ-панели и команды", "Уведомления и интеграция с хранилищами (клиенты, заказы, абонементы)", "Система автоматизированной отчётности с ИИ — снизила ручные операции и ускорила подготовку отчётов"] },
    { t: "tech", items: ["PHP", "Python", "Telegram Bot API", "AI-автоматизация"] },
  ],
};

const extensions: FileNode = {
  id: "experience/browser-extensions.md",
  name: "browser-extensions.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "Браузерные расширения для торговых платформ" },
    { t: "p", text: "Chrome-расширения (Manifest V3) для TraderNet (Freedom Bank) и Binance: улучшение интерфейса и продуктивности трейдеров." },
    { t: "ul", items: ["Улучшения UI, дополнительные панели и метрики", "Автоматизация действий, мониторинг рынка, уведомления", "Интеграция с API торговых платформ", "Набор утилит: парсер данных, детектор CSS, «копировалка» интерфейсных блоков"] },
    { t: "tech", items: ["Chrome Extension API (MV3)", "Service Workers", "Content Scripts", "TypeScript"] },
  ],
};

const githubLive: FileNode = {
  id: "live/github.stats.tsx",
  name: "github.stats.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "GitHub — живые данные" },
    { t: "p", text: "Этот файл реально дёргает GitHub REST API через серверный роут Next.js (кэш 1ч, чтобы не упереться в лимит). Ниже — мои репозитории, звёзды и языки, обновляются сами." },
    { t: "callout", text: "Доказательство вместо слов: данные тянутся вживую при открытии файла, а не вшиты в код." },
  ],
};

const contributionsLive: FileNode = {
  id: "live/contributions.tsx",
  name: "contributions.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Активность на GitHub" },
    { t: "p", text: "Сетка контрибуций за последний год — тянется вживую по GitHub API при открытии файла. Наведи на клетку, чтобы увидеть число коммитов за день." },
    { t: "callout", text: "Доказательство, а не скриншот: данные запрашиваются в реальном времени. Сетка умеет объединять несколько источников в один календарь (на будущее)." },
  ],
};

const marketLive: FileNode = {
  id: "live/market.live.tsx",
  name: "market.live.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Крипторынок — realtime" },
    { t: "p", text: "Живые цены с Binance по WebSocket (тот же realtime-слой, что я делаю в Vortan): мультиплексированный поток, авто-реконнект с экспоненциальным backoff. Цена мигает зелёным/красным на каждом тике." },
    { t: "callout", text: "Это не картинка — это настоящий WebSocket к wss://stream.binance.com. Открой DevTools → Network → WS." },
  ],
};

const settings: FileNode = {
  id: ".vscode/settings.json",
  name: "settings.json",
  language: "JSON",
  blocks: [
    { t: "h1", text: "⚙️ Настройки сайта" },
    { t: "p", text: "Это настоящий settings.json с валидацией. Меняй значения — и сайт реагирует вживую: тема, размер шрифта, миникарта, сайдбар, терминал. Никакой перезагрузки." },
    { t: "callout", text: "Попробуй: поменяй \"workbench.colorTheme\" на \"monokai\" или \"editor.fontSize\" на 18. Состояние сохраняется в localStorage." },
  ],
};

const ccusage: FileNode = {
  id: "meta/ai-usage.json",
  name: "ai-usage.json",
  language: "JSON",
  blocks: [
    { t: "h1", text: "🤖 Использование ИИ" },
    { t: "p", text: "ИИ — часть моего рабочего процесса. Ниже настоящая статистика по двум инструментам: Claude Code (агент Anthropic в терминале) и OpenRouter (доступ к десяткам моделей через один API). Цифры выгружены из ccusage и из дашборда OpenRouter." },
    { t: "callout", text: "Это реальные экспорты на 19.06.2026, а не моковые данные. Claude Code — премиум-агент (Opus 4.8); OpenRouter — много дешёвых/бесплатных моделей для экспериментов." },
  ],
};

const contact: FileNode = {
  id: "contact/contact.tsx",
  name: "contact.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Связаться" },
    { t: "p", text: "Открыт к найму в компанию, фрилансу — любому формату. Астана / удалёнка." },
    { t: "callout", text: "Форма ниже — рабочая: жмёшь «Отправить», и сообщение реально уходит через серверный API-роут Next.js с валидацией на Zod. Это и есть мини-доказательство бэкенда." },
    { t: "links", items: [{ label: "GitHub", href: GITHUB }, { label: "Email", href: "mailto:bigboyvova01@gmail.com" }] },
  ],
};

/* ------------------------------------------------------------------ */
/*  FILE TREE                                                          */
/* ------------------------------------------------------------------ */

export const tree: FolderNode = {
  id: "root",
  name: "PORTFOLIO",
  children: [
    {
      id: ".vscode",
      name: ".vscode",
      children: [settings],
    } as FolderNode,
    {
      id: "about",
      name: "about",
      children: [about, skills],
    } as FolderNode,
    {
      id: "projects",
      name: "projects",
      children: [wifi, pcHealth, repoAntiRot, multiAgent, vortan, repoVis],
    } as FolderNode,
    {
      id: "experience",
      name: "experience",
      children: [hrSearch, tgBots, extensions],
    } as FolderNode,
    {
      id: "live",
      name: "live",
      children: [contributionsLive, githubLive, marketLive],
    } as FolderNode,
    {
      id: "meta",
      name: "meta",
      children: [ccusage],
    } as FolderNode,
    {
      id: "contact",
      name: "contact",
      children: [contact],
    } as FolderNode,
    readme,
  ],
};

/* Flat index of all files for quick lookup / command palette. */
export const allFiles: FileNode[] = [];
(function collect(node: TreeNode) {
  if ("children" in node) node.children.forEach(collect);
  else allFiles.push(node);
})(tree);

export const fileById = (id: string) => allFiles.find((f) => f.id === id);

/** First h1 of a file (used for the browser tab title / share metadata). */
export function fileTitle(id: string): string {
  const f = fileById(id);
  if (!f) return "Vladimir";
  for (const b of f.blocks) if (b.t === "h1") return b.text;
  return f.name;
}

/** First paragraph of a file (used for the meta description). */
export function fileSummary(id: string): string {
  const f = fileById(id);
  if (!f) return "";
  for (const b of f.blocks) if (b.t === "p") return b.text;
  return "";
}

export const DEFAULT_OPEN = readme.id;
