import { SUMMARY, AVAILABILITY, LANGUAGES, CONTACTS, SKILLS, PROJECTS, projectFiles, experienceFiles } from "./profile";
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
    { t: "h1", text: "👋 Vladimir — Frontend / Full-Stack Developer" },
    {
      t: "p",
      text: SUMMARY,
    },
    { t: "callout", text: "Совет: это VSCode. Открывай файлы слева, жми ⌘K / Ctrl+K для палитры команд, и попробуй терминал внизу — он живой." },
    { t: "p", text: AVAILABILITY },
    { t: "p", text: LANGUAGES },
    { t: "links", items: CONTACTS },
    { t: "h2", text: "Избранные проекты" },
    ...PROJECTS.slice(0, 6).flatMap((project) => [
      { t: "h3" as const, text: project.title },
      { t: "p" as const, text: project.summary },
      { t: "links" as const, items: [{ label: "Подробнее", href: "/?file=" + encodeURIComponent(project.id) }] },
    ]),
    { t: "h2", text: "Чем занимаюсь" },
    {
      t: "ul",
      items: [
        "Frontend: React 18/19, TypeScript (strict), Next.js, Angular 19, Vue 3",
        "Backend: Node.js / NestJS, Convex, PostgreSQL, Go, PHP / Symfony, Python",
        "Realtime: WebSocket с авто-реконнектом, мультиплексирование потоков",
        "AI: интеграция LLM через OpenRouter / Claude API, RAG, мультиагентные системы",
        "WordPress: собственные темы, CPT, ACF PRO, CF7, Polylang",
      ],
    },
    { t: "tech", items: ["TypeScript", "React", "Next.js", "Node.js", "NestJS", "Convex", "WordPress", "PostgreSQL", "Python", "Docker"] },
    {
      t: "links",
      items: [
        { label: "GitHub", href: GITHUB },
        { label: "Repo Janitor", href: "https://repo-janitor.app" },
        { label: "Readme Studio", href: "https://ypciiiak.github.io/custom-readme/" },
        { label: "Ясень 3D", href: "https://ypciiiak.github.io/all-repo/mebel/" },
        { label: "Физлаб 3D", href: "https://ypciiiak.github.io/all-repo/" },
        { label: "CyberPath", href: "https://ypciiiak.github.io/cyber-sec/#/" },
        { label: "ARGUS", href: GITHUB + "/ARGUS" },
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
      text: SUMMARY,
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
    { t: "p", text: AVAILABILITY },
    { t: "p", text: LANGUAGES },
    { t: "h2", text: "Личное" },
    { t: "p", text: "Спорт: баскетбол, фитнес, горные лыжи, коньки/ролики, плавание и водное поло." },
    { t: "divider" },
    { t: "p", text: "Образование: «Программная инженерия», ТУСУР (неоконченное высшее). Также стипендиальные IT-программы в ТГУ и AITU." },
  ],
};

const resume: FileNode = {
  id: "about/resume.md",
  name: "resume.md",
  language: "Markdown",
  blocks: [
    { t: "h1", text: "📄 Резюме" },
    { t: "p", text: SUMMARY },
    { t: "callout", text: "Нужен классический PDF? Открой печатную версию по ссылке ниже и нажми «Скачать PDF» — браузер сохранит файл со всеми стилями." },
    { t: "h2", text: "Кратко" },
    {
      t: "ul",
      items: [
        "2+ года: агентские проекты, HR-tech, стартап и собственные продукты",
        "Frontend: React 18/19, TypeScript strict, Next.js, Angular 19, Vue 3",
        "Backend: Node.js / NestJS, Convex, PostgreSQL, Go, PHP / Symfony, Python",
        "AI: OpenRouter / Claude API, RAG, мультиагентные системы",
      ],
    },
    {
      t: "links",
      items: [
        { label: "📥 Открыть печатную версию (PDF)", href: "/cv" },
        { label: "GitHub", href: GITHUB },
        ...CONTACTS.filter((link) => link.label !== "GitHub"),
      ],
    },
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
      code: JSON.stringify(SKILLS, null, 2),
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



const multiAgent: FileNode = {
  id: "projects/multi-agent-arena.ts",
  name: "multi-agent-arena.ts",
  language: "TypeScript",
  blocks: [
    { t: "h1", text: "Hephaestus — Multi-Agent LLM Arena" },
    { t: "callout", text: "Один из проектов по мультиагентным системам. Web-приложение: мульти-модельный чат, конфигурируемые DAG-пайплайны («Арена») и симуляция событий поверх OpenRouter + локальных моделей Ollama." },
    { t: "h2", text: "Что внутри" },
    { t: "ul", items: [
      "Мульти-модельный чат: один промпт уходит сразу в несколько моделей — сравниваешь ответы.",
      "Arena-пайплайны: строишь направленный граф (DAG) из узлов-агентов и исполняешь его движком executor.",
      "Спец-агенты с пресетами: classifier, analyst, researcher, synthesizer, summarizer (19 облачных + 5 Ollama-пресетов).",
      "Симуляция событий: политика/экономика/военное/технологии с кросс-доменным анализом.",
      "Ollama local: бесплатные локальные модели (Llama, Phi, Qwen) — 100% приватно, без затрат на API.",
      "Оптимизация токенов: сжатие контекста, RAG, умное чтение файлов.",
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

const journalLive: FileNode = {
  id: "live/journal.tsx",
  name: "journal.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Инженерный журнал" },
    { t: "p", text: "Живая лента того, что я делаю в коде: коммиты, PR, релизы и закрытые задачи — собирается автоматически из GitHub-активности (а для меня — ещё и из задач личного кабинета). Не статичный список проектов, а доказательство, что я стабильно пишу и поддерживаю прод." },
    { t: "callout", text: "Фильтр «Только production-grade» прячет мелкий шум (chore/docs/wip/merge) и оставляет фичи, фиксы, релизы и смерженные PR. Данные тянутся вживую по GitHub API." },
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
    { t: "callout", text: "Архивный срез на 19.06.2026. Это не текущие расходы и не полный список используемых сегодня инструментов; актуальную работу описывают разделы опыта и проектов." },
  ],
};

const guestbook: FileNode = {
  id: "community/guestbook.tsx",
  name: "guestbook.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "💬 Гостевая книга" },
    { t: "p", text: "Оставь след: пара слов о сайте, фидбек или просто привет. Вход через GitHub — записи публичные и живут в Supabase." },
    { t: "callout", text: "Это живая фича: GitHub OAuth + Postgres. Автор записи берётся из подписанной сессии, а не из формы — подделать имя не выйдет." },
  ],
};

const contact: FileNode = {
  id: "contact/contact.tsx",
  name: "contact.tsx",
  language: "TypeScript React",
  blocks: [
    { t: "h1", text: "Связаться" },
    { t: "p", text: AVAILABILITY },
    { t: "callout", text: "Форма ниже — рабочая: жмёшь «Отправить», и сообщение реально уходит через серверный API-роут Next.js с валидацией на Zod. Это и есть мини-доказательство бэкенда." },
    { t: "links", items: CONTACTS },
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
      children: [about, skills, resume],
    } as FolderNode,
    {
      id: "projects",
      name: "projects",
      children: [...projectFiles, wifi, pcHealth, multiAgent, vortan, extSuite, repoVis],
    } as FolderNode,
    {
      id: "experience",
      name: "experience",
      children: [...experienceFiles, extensions],
    } as FolderNode,
    {
      id: "live",
      name: "live",
      children: [journalLive, contributionsLive, githubLive, marketLive],
    } as FolderNode,
    {
      id: "meta",
      name: "meta",
      children: [ccusage],
    } as FolderNode,
    {
      id: "community",
      name: "community",
      children: [guestbook],
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
    blocks: [],
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
  {
    id: "workspace/mail.tsx",
    name: "mail.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "📬 Почта" }],
  },
  {
    id: "workspace/bitrix.tsx",
    name: "bitrix.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "💼 Bitrix24" }],
  },
  {
    id: "workspace/assistant.tsx",
    name: "assistant.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/news.tsx",
    name: "news.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "📰 Новости" }],
  },
  {
    id: "workspace/music.tsx",
    name: "music.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "🎵 Яндекс Музыка" }],
  },
  {
    id: "workspace/telegram.tsx",
    name: "telegram.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/notion.tsx",
    name: "notion.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/drive.tsx",
    name: "drive.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/models.tsx",
    name: "models.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/diagrams.tsx",
    name: "diagrams.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/brain.tsx",
    name: "brain.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/workflows.tsx",
    name: "workflows.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/projects.tsx",
    name: "projects.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "📁 Проекты" }],
  },
  {
    id: "workspace/replays.tsx",
    name: "replays.tsx",
    language: "TypeScript",
    blocks: [],
  },
  {
    id: "workspace/subscriptions.tsx",
    name: "subscriptions.tsx",
    language: "TypeScript",
    blocks: [{ t: "h1", text: "💳 Подписки" }],
  },
];

export const WORKSPACE_IDS = WORKSPACE_FILES.map((f) => f.id);

// Make workspace files resolvable by fileById / tabs without listing them in the tree.
allFiles.push(...WORKSPACE_FILES);
