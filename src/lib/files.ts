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
        "Auth & данные: GitHub OAuth, сессии на подписанных cookie, Supabase/Postgres",
      ],
    },
    { t: "tech", items: ["TypeScript", "React", "Next.js", "Go", "Node.js", "Angular", "PHP/Symfony", "Python", "Supabase", "OAuth", "Docker"] },
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
    { t: "p", text: "Монитор «здоровья» и деградации репозитория. Сканирует кодовую базу на тихо накапливающийся «rot» — утёкшие секреты, заброшенные и уязвимые зависимости, стейл-ветки, стареющие TODO, мёртвый и закомментированный код, отключённые тесты, бинарный bloat — ставит балл и грейд A–F и показывает всё в дашборде. Опциональный AI-проход добавляет короткий вердикт к каждой находке через OpenRouter." },
    {
      t: "metrics",
      items: [
        { label: "Сканеры", value: "16 независимых сканеров" },
        { label: "Тесты", value: "46 тестовых файлов (Vitest)" },
        { label: "Оценка", value: "0–100 балл + грейд A–F" },
      ],
    },
    { t: "callout", text: "pnpm-монорепо из 4 частей: общий движок (@repo-anti-rot/core), CLI, обёртка GitHub Action и Next.js-дашборд. Работает одинаково на macOS / Linux / Windows (все пути через path/os.tmpdir, shell-агностично)." },
    { t: "h2", text: "Что проверяют 16 сканеров" },
    { t: "ul", items: [
      "Безопасность: committed secrets, leftover-debug, уязвимые зависимости (vulnerable-deps).",
      "Зависимости: outdated-deps, dependency-funeral (заброшенные), lockfile-drift.",
      "Мёртвый груз: dead-code, commented-code, todo-debt, repo-bloat (бинарный раздув).",
      "Процесс и сообщество: stale-branch, bus-factor, project-hygiene, dockerfile, broken-doc-links, env-lifecycle.",
    ] },
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
    { t: "p", text: "В дашборде: портфель репозиториев с трендами, AI-обогащение находок через same-origin прокси к OpenRouter (ключ только в localStorage), command palette (⌘K), расписание автосканов, score-drop webhook, экспорт в Markdown/CSV/JSON. Роут /api/scan дёргает собранный CLI, чтобы клонировать и просканировать любой репозиторий." },
    { t: "tech", items: ["TypeScript", "Next.js", "pnpm monorepo", "Node.js CLI", "GitHub Action", "OSV / npm / PyPI", "Vitest", "OpenRouter"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/repo-janitor" }] },
  ],
};

const multiAgent: FileNode = {
  id: "projects/multi-agent-arena.ts",
  name: "multi-agent-arena.ts",
  language: "TypeScript",
  blocks: [
    { t: "h1", text: "Hephaestus — Multi-Agent LLM Arena" },
    { t: "callout", text: "Текущий основной проект — в активной разработке. Web-приложение: мульти-модельный чат, конфигурируемые DAG-пайплайны («Арена») и симуляция событий поверх OpenRouter + локальных моделей Ollama." },
    { t: "h2", text: "Что внутри" },
    { t: "ul", items: [
      "Мульти-модельный чат: один промпт уходит сразу в несколько моделей — сравниваешь ответы.",
      "Arena-пайплайны: строишь направленный граф (DAG) из узлов-агентов и исполняешь его движком executor.",
      "Спец-агенты с пресетами: classifier, analyst, researcher, synthesizer, summarizer (19 облачных + 5 Ollama-пресетов).",
      "Симуляция событий: политика/экономика/военное/технологии с кросс-доменным анализом.",
      "Ollama local: бесплатные локальные модели (Llama, Phi, Qwen) — 100% приватно, без затрат на API.",
      "Оптимизация токенов: сжатие контекста, RAG, умное чтение файлов — до 80% экономии.",
      "RAG-база знаний на BM25-поиске по индексированным файлам проекта (с включением соседних чанков).",
      "AI-редактирование файлов прямо из чата/пайплайна, smart-fallback на резервные модели при таймауте.",
      "Аналитика расхода: токены, оценка стоимости, графики Waterfall/Gantt.",
      "Telegram-бот (текст, фото, документы, голос) и система переиспользуемых скиллов (SKILL.md).",
    ] },
    { t: "tech", items: ["TypeScript", "Next.js", "Zustand", "OpenRouter API", "Ollama", "BM25 RAG", "js-tiktoken", "Telegram Bot API"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/Hephaestus" }] },
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

const extSuite: FileNode = {
  id: "projects/chrome-extensions-suite.tsx",
  name: "chrome-extensions-suite.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Сюита Chrome-расширений (MV3)" },
    { t: "callout", text: "Монорепо на npm workspaces (apps/*): общий стек, единый build-паттерн (Vite multi-IIFE), тёмная UI-тема и подход к безопасности. Три самостоятельных продукта — приватность, память, кастомизация UI." },
    { t: "p", text: "TypeScript strict, чистый MV3 без сети, remote-code и eval. Всё работает 100% локально. Каждый продукт — отдельное приложение, которое можно вынести и опубликовать независимо (subtree split)." },

    { t: "h2", text: "1. Privacy Guard — антитрекинг + анти-фингерпринт" },
    { t: "p", text: "Считает «Privacy Score» страницы, блокирует трекеры и детектит попытки фингерпринтинга — canvas, WebGL, audio, navigator, screen, fonts. Ведёт историю и статистику, мастер-выключатель и пер-сайт allowlist." },
    { t: "ul", items: [
      "Content-скрипты в двух мирах: ISOLATED (мост/настройки) и MAIN (перехват fingerprint-API в контексте страницы).",
      "Блокировка через declarativeNetRequest + сигналы webRequest, per-site счётчики.",
      "Скоринговая модель с разбивкой по факторам и борьбой с false-positive.",
      "DOM-XSS защита: экранирование данных страницы перед innerHTML в привилегированном UI.",
    ] },

    { t: "h2", text: "2. TabResurrect — менеджер памяти вкладок" },
    { t: "p", text: "Усыпляет простаивающие вкладки (tabs.discard), освобождая RAM, и мгновенно восстанавливает их при возврате. Живая метрика сэкономленной памяти и пер-таб управление." },
    { t: "ul", items: [
      "chrome.tabs.discard + chrome.alarms (фоновый sweep), storage.session vs local.",
      "Самокалибрующаяся метрика: семплит system.memory до/после усыпления, отбрасывает выбросы (30–1500 МБ), после ≥3 замеров переходит с оценки на измеренное среднее для конкретной машины.",
      "Слоистая защита от потери данных: активная вкладка / введённый текст (formwatch content-script) / POST-навигация (webRequest) / аудио / pinned / ручной allowlist.",
    ] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/tabs-ram-optimise" }] },

    { t: "h2", text: "3. Chat Skins — визуальный редактор UI веб-приложений" },
    { t: "p", text: "Кастомизация Telegram Web / WhatsApp Web (фон чата, акцент, цвета пузырей, размеры) плюс рескин любого сайта через point-and-click инспектор." },
    { t: "ul", items: [
      "Переопределение CSS-переменных приложений (устойчиво к ребрендингу хеш-классов) + точечные селекторы.",
      "Инспектор элементов в Shadow DOM + constructable stylesheets (adoptedStyleSheets / replaceSync) — обход строгого CSP (напр. YouTube).",
      "Алгоритм гарантированно уникального селектора: readable-путь → проверка querySelectorAll → fallback на :nth-child.",
      "Мультивыбор по Ctrl/⌘ → групповой селектор; live-применение через storage.onChanged; фоны как data-URL (unlimitedStorage); миграция формата хранилища.",
    ] },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "Идея уникального селектора: берём читаемый путь, и если он не однозначен — добавляем :nth-child.",
      code: `function uniqueSelector(el: Element): string {
  const readable = buildReadablePath(el); // теги/классы/data-*
  if (document.querySelectorAll(readable).length === 1) return readable;

  // не уникален → уточняем позицией среди соседей
  const parent = el.parentElement;
  if (!parent) return readable;
  const idx = [...parent.children].indexOf(el) + 1;
  return \`\${uniqueSelector(parent)} > :nth-child(\${idx})\`;
}`,
    },

    { t: "h2", text: "Сквозные инженерные темы" },
    { t: "ul", items: [
      "Chrome MV3 целиком: service worker, content-scripts (оба мира), DNR/webRequest, alarms, storage (local/session), system.memory, action popup, options page.",
      "Безопасность: изоляция миров, отсутствие сети/remote-code/eval, экранирование DOM-XSS, CSP-совместимый инжект.",
      "Инфраструктура: TypeScript strict, монорепо на workspaces, кастомный Vite-оркестратор (по сборке на entry), subtree split для выноса продукта.",
      "UX-инжиниринг: живой предпросмотр без перезагрузки, самокалибрующиеся метрики, отказоустойчивость к динамическим SPA.",
    ] },

    { t: "tech", items: ["TypeScript", "Chrome MV3", "Vite", "declarativeNetRequest", "Content Scripts (ISOLATED/MAIN)", "Shadow DOM", "adoptedStyleSheets", "npm workspaces"] },
  ],
};

const repoVis: FileNode = {
  id: "projects/repo-visualizer.tsx",
  name: "repo-visualizer.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Repository Visualizer" },
    { t: "p", text: "Приложение на Next.js: берёт любой GitHub-репозиторий, рисует его структуру интерактивным графом и прогоняет AI-анализ кода. На вход — URL репо, на выход — наглядная карта + отчёт." },
    { t: "ul", items: [
      "Три глубины анализа: overview / structure / deep — от беглого обзора до разбора по файлам.",
      "Любая модель OpenRouter настраивается через OPENROUTER_MODEL_ID (по умолчанию mistral-small).",
      "GitHub API с опциональным токеном для повышенного лимита запросов.",
      "Отчёты по архитектуре, стеку и качеству кода + интерактивный граф структуры (react-xflow).",
    ] },
    { t: "tech", items: ["Next.js", "TypeScript", "GitHub API", "OpenRouter", "react-xflow"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/repo-in-tree-visual" }] },
  ],
};

const personalWorkspace: FileNode = {
  id: "projects/personal-workspace.tsx",
  name: "personal-workspace.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Личный кабинет с GitHub-аутентификацией" },
    { t: "callout", text: "Этот самый сайт. Открой панель Extensions слева (иконка с кубиками) — там вход через GitHub, заметки, календарь и задачи. Гостям всё доступно в демо-режиме (read-only), владельцу — полный CRUD." },
    { t: "p", text: "Приватный дашборд, встроенный прямо в IDE-метафору портфолио. Своя реализация OAuth-входа через GitHub (без NextAuth), разграничение прав owner/guest и хранение данных в Supabase. Цель — показать auth, работу с сессиями/токенами и аккуратное разделение доступа на реальной фиче, а не на туториале." },

    { t: "h2", text: "Аутентификация без библиотек" },
    { t: "ul", items: [
      "GitHub OAuth вручную: authorize → callback → обмен code на access token → запрос профиля.",
      "Защита от CSRF: одноразовый state в HttpOnly-cookie, сверка на колбэке.",
      "Сессия — подписанный HMAC-SHA256 токен (Web Crypto) в HttpOnly+Secure+SameSite cookie. Тело cookie не доверяем без проверки подписи.",
      "Владелец определяется сравнением GitHub id с OWNER_GITHUB_ID — любой другой валидный вход остаётся гостем.",
    ] },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "Подпись и проверка сессии на Web Crypto — формат <payload>.<signature>, без внешних зависимостей.",
      code: `export async function signSession(s: Session): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(s)));
  const key = await hmacKey(); // importKey(AUTH_SECRET, HMAC-SHA256)
  const sig = await crypto.subtle.sign("HMAC", key, enc(payload));
  return \`\${payload}.\${b64url(new Uint8Array(sig))}\`;
}

export async function verifySession(token?: string): Promise<Session | null> {
  const [payload, sig] = (token ?? "").split(".");
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), dec(sig), enc(payload));
  if (!ok) return null;                       // подделанная/битая cookie
  const s = JSON.parse(decode(payload)) as Session;
  return s.exp * 1000 < Date.now() ? null : s; // протухшая сессия
}`,
    },

    { t: "h2", text: "Данные и разграничение доступа" },
    { t: "ul", items: [
      "Supabase (PostgREST) как бэкенд: notes / tasks / events, доступ тонким fetch-клиентом на service-role — только на сервере, в браузер ключ не попадает.",
      "Единый CRUD-роут /api/workspace/[kind]: каждый метод за requireOwner(), тела валидируются zod (whitelist полей).",
      "RLS в Postgres включён без публичных политик: anon-ключ не читает и не пишет ничего, весь доступ — через серверную сессию.",
      "Graceful degradation: без переменных окружения сайт работает как обычно, а кабинет показывает демо-данные.",
    ] },
    { t: "h2", text: "UI" },
    { t: "p", text: "Фичи живут как вкладки внутри редактора (виртуальные «файлы»), запускаются из панели Extensions. Состояние сессии — отдельный zustand-стор, который тянет /api/auth/me и переключает интерфейс между демо и владельцем." },
    { t: "tech", items: ["Next.js 16", "TypeScript", "GitHub OAuth", "Web Crypto (HMAC)", "Supabase / PostgREST", "zod", "zustand", "HttpOnly cookies"] },
    { t: "links", items: [{ label: "Открыть на GitHub", href: GITHUB + "/portfolioV5" }] },
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
    { t: "h1", text: "Серия продакшн Telegram-ботов" },
    { t: "p", text: "Роль: Backend-разработчик / разработчик Telegram-ботов. Серия прод-ботов на единой архитектуре Symfony + Doctrine + Docker. ~120 коммитов в 5 проектах." },
    { t: "callout", text: "Единый каркас на все боты: Symfony 7.3–8.0, Doctrine ORM 3 + Migrations, MySQL, Docker Compose, Telegram Bot API. Поверх него — разная доменная логика под каждый продукт." },

    { t: "h2", text: "🤖 AI-бот генерации контента (ii-bot) — ключевой проект" },
    { t: "p", text: "PHP 8.4, Symfony 8.0, Doctrine ORM 3, Docker, Telegram Bot API, VK API, OpenAI и внешние AI-провайдеры." },
    { t: "ul", items: [
      "Генерация изображений и видео: text-to-video, image-to-video, reference-изображения, выбор длительности и качества вплоть до 4K.",
      "Интеграция множества AI-моделей и провайдеров (Kling 2.1 Pro, Seedream, OpenAI и др.) с выбором модели/качества прямо из интерфейса бота.",
      "Режим AI deep-research (/research) и web-search инструменты для чат-бота.",
      "Двусторонняя интеграция Telegram ↔ VK, структурное логирование (Monolog), стабилизация генерации.",
    ] },

    { t: "h2", text: "📊 Бот автоматической email-отчётности (theact-report-bot)" },
    { t: "p", text: "PHP 8.2, Symfony 7.3, Doctrine ORM 3, MySQL, IMAP, PhpSpreadsheet, OpenAI, Cron." },
    { t: "ul", items: [
      "Пайплайн: IMAP-парсинг писем → извлечение Excel (PhpSpreadsheet) → анализ через OpenAI → формирование отчётов.",
      "Планировщик (Cron) с автосканом почты по расписанию и авто-отправкой отчётов.",
      "Админ-панель управления промптами (CRUD) и система авторизации пользователей.",
      "Аналитика: сравнение периодов (день/месяц/год), расчёт плановых показателей.",
    ] },

    { t: "h2", text: "🏋️ Бот фитнес-зала (gym-bot)" },
    { t: "p", text: "PHP 8.2, Symfony 7.3, Doctrine ORM 3, MySQL, Docker, Symfony Security." },
    { t: "ul", items: [
      "Ролевая модель доступа (admin / trainer / user) с разграничением функционала.",
      "CRUD-сущности (адреса, типы тренировок), управление абонементами и тренировками.",
      "Опросы (polls), поиск по телефону, навигационное меню.",
    ] },

    { t: "h2", text: "🛍️ Бот маркетплейса косметики (kosmetik-bot)" },
    { t: "p", text: "PHP, Symfony, Doctrine, Docker, REST-синхронизация, Cron." },
    { t: "ul", items: [
      "Команды полной и инкрементальной синхронизации каталога и изображений по Cron.",
      "Система авторизации, админ-UI управления магазинами (CRUD).",
    ] },

    { t: "h2", text: "🧠 Бот психологических тестов/сценариев (manipulate-bot)" },
    { t: "p", text: "PHP, Symfony, Doctrine ORM, MySQL." },
    { t: "ul", items: [
      "Движок сценариев и тестов с сохранением ответов в БД (схема + миграции).",
      "Админ-панель управления сценариями/вопросами (CRUD), команда статистики /usage.",
    ] },

    { t: "tech", items: ["PHP 8.2–8.4", "Symfony 7.3 / 8.0", "Doctrine ORM 3 + Migrations", "MySQL", "Docker Compose", "Telegram Bot API", "VK API", "OpenAI API", "IMAP", "PhpSpreadsheet", "Monolog", "Cron"] },
  ],
};

const extensions: FileNode = {
  id: "experience/browser-extensions.md",
  name: "browser-extensions.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "Браузерные расширения для торговых платформ" },
    { t: "p", text: "Chrome-расширения (Manifest V3) для TraderNet (Freedom Bank) и Binance: улучшение интерфейса, продуктивности и аналитики прямо поверх сайта биржи." },
    { t: "ul", items: ["Улучшения UI, дополнительные панели и метрики", "Автоматизация действий, мониторинг рынка, уведомления", "Интеграция с API торговых платформ", "Набор утилит: парсер данных, детектор CSS, «копировалка» интерфейсных блоков"] },

    { t: "h2", text: "Кейс: Vortan Crypto Analytics (Binance overlay)" },
    { t: "callout", text: "MV3-расширение, которое считает Master Trend, полосы Боллинджера и риск-профиль портфеля 100% локально в браузере — без API-ключей биржи и без вынесения торговых данных наружу." },
    { t: "p", text: "Расширение рисует поверх binance.com свой overlay с аналитикой, а лёгкий backend (Next.js + Supabase) нужен только для аккаунтов и опциональной синхронизации портфеля между устройствами." },

    { t: "h3", text: "Passive-first сбор данных (без ключей биржи)" },
    { t: "p", text: "Вместо API-ключей расширение пассивно наблюдает то, что страница Binance уже грузит сама: page-hook патчит fetch/XHR/WebSocket в контексте страницы и через postMessage отдаёт нужные ответы (klines, баланс, активы, PnL, открытые ордера) в content-script. Ключи и пароли биржи не нужны и не собираются." },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "page-hook: перехватываем ответы Binance, которые страница и так запрашивает, и пробрасываем их в расширение.",
      code: `const origFetch = window.fetch;
window.fetch = async function (...args) {
  const res = await origFetch.apply(this, args);
  const url = String(args[0]);
  if (/\\/api\\/v3\\/klines/.test(url)) {
    // не блокируем страницу: читаем клон ответа
    res.clone().json()
      .then((data) => window.postMessage({ type: "BINANCE_NET_PAYLOAD", url, data }, "*"))
      .catch(() => {});
  }
  return res; // оригинальный ответ уходит на сайт без изменений
};`,
    },

    { t: "h3", text: "Аналитика считается локально" },
    { t: "ul", items: [
      "Master Trend: STL-декомпозиция дневного VWAP (тренд / сезонность / шум) с фолбэком на центрированное скользящее среднее; направление, сила тренда и «рыночный шум» — линейной регрессией по тренд-компоненте.",
      "Полосы Боллинджера (20, 2σ) и band-width как мера волатильности.",
      "Риск-профиль портфеля: волатильность 30д, макс. просадка, коэффициент Шарпа, VaR 95% — по историческим ценам (CoinGecko как фолбэк-источник).",
      "Тяжёлые расчёты вынесены в Web Worker, прогресс — колбэками, чтобы UI не лагал на длинных историях.",
    ] },
    {
      t: "code",
      lang: "typescript",
      collapsible: true,
      caption: "Полосы Боллинджера локально — никакого бэкенда, только массив цен.",
      code: `for (let i = period - 1; i < series.length; i++) {
  const w = series.slice(i - period + 1, i + 1);
  const m = mean(w);
  const s = stddev(w);
  out[i] = {
    upper: m + mult * s,
    lower: m - mult * s,
    rolling_mean: m,
    band_width_pct: ((2 * mult * s) / (m || 1)) * 100,
  };
}`,
    },

    { t: "h3", text: "Backend и хранение" },
    { t: "ul", items: [
      "Next.js API + Supabase (PostgreSQL): аккаунты и активы пользователей под Row Level Security — каждый видит только свои данные.",
      "Синхронизация портфеля не чаще раза в час, идемпотентный upsert по уникальному индексу (user_id + symbol + exchange + asset_type) — без дублей.",
      "В браузере: chrome.storage.local для сессии и флагов, IndexedDB как кэш портфеля на 24 часа.",
      "Auth-bridge: отдельный content-script на лендинге логина прокидывает результат входа в расширение через postMessage → chrome.runtime.",
    ] },

    { t: "tech", items: ["Chrome Extension API (MV3)", "Service Workers", "Content Scripts", "TypeScript", "Vite", "Web Workers", "IndexedDB", "Next.js", "Supabase / PostgreSQL", "Lightweight Charts"] },
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
      children: [wifi, pcHealth, repoAntiRot, multiAgent, vortan, extSuite, repoVis, personalWorkspace],
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

/* ------------------------------------------------------------------ */
/*  WORKSPACE  (личный кабинет — открывается из панели Extensions)     */
/* ------------------------------------------------------------------ */

/** Virtual "files" backing the workspace tabs. Not shown in the Explorer tree —
 *  they are launched from the Extensions panel and rendered by custom panels. */
export const WORKSPACE_FILES: FileNode[] = [
  {
    id: "workspace/dashboard.tsx",
    name: "dashboard.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "🏠 Главная" }],
  },
  {
    id: "workspace/notes.md",
    name: "notes.md",
    language: "Markdown",
    blocks: [{ t: "h1", text: "📝 Заметки" }],
  },
  {
    id: "workspace/calendar.tsx",
    name: "calendar.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "📅 Календарь" }],
  },
  {
    id: "workspace/tasks.todo",
    name: "tasks.todo",
    language: "TODO",
    blocks: [{ t: "h1", text: "✅ Задачи" }],
  },
];

export const WORKSPACE_IDS = WORKSPACE_FILES.map((f) => f.id);

// Make workspace files resolvable by fileById / tabs without listing them in the tree.
allFiles.push(...WORKSPACE_FILES);
