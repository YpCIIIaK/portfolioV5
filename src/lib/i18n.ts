"use client";

import { useEditor } from "./store";

/**
 * Lightweight i18n for the portfolio content.
 *
 * The file tree (src/lib/files.ts) stays authored in Russian — the source of
 * truth. This dictionary maps each Russian string to English; at render time
 * `translate()` swaps it when the language is set to "en". Anything missing
 * from the map falls back to the original Russian, so partial coverage is safe.
 * Code bodies and tech-tag arrays are intentionally left as-is.
 */
export const EN: Record<string, string> = {
  // ---- README ----
  "Фронтенд, выросший в фуллстек. Делаю интерфейсы, которые не бесят, и бэкенд, который их кормит данными в реальном времени. 2+ года в пет-проектах, двух стартапах и коммерческой разработке.":
    "A frontend dev who grew into fullstack. I build interfaces that don't get in the way, and backends that feed them data in real time. 2+ years across pet projects, two startups and commercial work.",
  "Совет: это VSCode. Открывай файлы слева, жми ⌘K / Ctrl+K для палитры команд, и попробуй терминал внизу — он живой.":
    "Tip: this is VSCode. Open files on the left, hit ⌘K / Ctrl+K for the command palette, and try the terminal below — it's live.",
  "Чем занимаюсь": "What I do",
  "Frontend: React 18/19, TypeScript (strict), Next.js, Angular 19, Vue 3":
    "Frontend: React 18/19, TypeScript (strict), Next.js, Angular 19, Vue 3",
  "Backend: Go (агенты сбора метрик), Node.js, PHP/Symfony, Python":
    "Backend: Go (metrics-collection agents), Node.js, PHP/Symfony, Python",
  "Realtime: WebSocket с авто-реконнектом, мультиплексирование потоков":
    "Realtime: WebSocket with auto-reconnect, multiplexed streams",
  "AI: интеграция LLM через OpenRouter / Claude API, RAG, мультиагентные системы":
    "AI: LLM integration via OpenRouter / Claude API, RAG, multi-agent systems",
  "Auth & данные: GitHub OAuth, сессии на подписанных cookie, Supabase/Postgres":
    "Auth & data: GitHub OAuth, signed-cookie sessions, Supabase/Postgres",

  // ---- About ----
  "О себе": "About me",
  "Меня зовут Владимир. Базируюсь в Астане, открыт к удалёнке. Комфортно работаю и с визуальной частью (вёрстка, компоненты, состояния, анимации), и с логикой (API, агенты на Go, боты, интеграция ИИ).":
    "My name is Vladimir. Based in Astana, open to remote. I'm equally comfortable with the visual side (layout, components, state, animations) and the logic (APIs, Go agents, bots, AI integration).",
  "Больше всего нравится создавать проекты, где есть веб-интерфейс и «живое» взаимодействие пользователя с данными и ИИ. Люблю быстро выводить фичи в прод и улучшать их по фидбеку.":
    "I most enjoy building projects with a web interface and \"live\" user interaction with data and AI. I like shipping features fast and improving them from feedback.",
  "Путь": "Journey",
  "Старт с фронтенда: сложные SPA, дизайн-системы на токенах, продвинутый UX":
    "Started in frontend: complex SPAs, token-based design systems, advanced UX",
  "Рост в realtime и данные: WebSocket-слой, нормализация и визуализация метрик":
    "Grew into realtime and data: WebSocket layer, metrics normalization and visualization",
  "Переход в бэкенд: Go-агенты сбора системных метрик, чистые парсеры, конкурентность":
    "Moved into backend: Go agents collecting system metrics, clean parsers, concurrency",
  "AI-инженерия: мультиагентные системы, RAG, аналитика использования ИИ":
    "AI engineering: multi-agent systems, RAG, AI-usage analytics",
  "Личное": "Personal",
  "Спорт: баскетбол, фитнес, горные лыжи, коньки/ролики, плавание и водное поло.":
    "Sports: basketball, fitness, skiing, skating/rollerblading, swimming and water polo.",
  "Образование: «Программная инженерия», ТУСУР (ожидаемое окончание 2028). Также стипендиальные IT-программы в ТГУ и AITU.":
    "Education: Software Engineering, TUSUR (expected graduation 2028). Also scholarship IT programs at TSU and AITU.",

  // ---- Skills ----
  "Технический стек": "Tech stack",

  // ---- WiFi Analyzer ----
  "Privacy-first инструмент: в реальном времени анализирует Wi-Fi-окружение и сетевую активность машины. Все данные остаются локально — ничего не уходит в облако.":
    "A privacy-first tool: it analyzes the Wi-Fi environment and the machine's network activity in real time. All data stays local — nothing goes to the cloud.",
  "Архитектура": "Architecture",
  "Go-агент + React-дашборд по WebSocket": "Go agent + React dashboard over WebSocket",
  "Платформы": "Platforms",
  "Windows / Linux одним кодом": "Windows / Linux from one codebase",
  "Тесты": "Tests",
  "Go-фикстуры + Vitest, CI на GitHub Actions": "Go fixtures + Vitest, CI on GitHub Actions",
  "Проблема": "Problem",
  "Классические speedtest-сервисы ничего не говорят о том, какой канал свободнее, куда реально уходит трафик и не «прилип» ли ноут к слабой точке. А подобные данные нельзя сливать в облако — это приватность.":
    "Classic speedtest services tell you nothing about which channel is freer, where traffic actually goes, or whether your laptop is stuck on a weak access point. And such data shouldn't leak to the cloud — that's privacy.",
  "Решение": "Solution",
  "Кросс-платформенный Go-агент: netsh (Windows), nmcli/ss (Linux) — парсеры понимают EN+RU локали":
    "Cross-platform Go agent: netsh (Windows), nmcli/ss (Linux) — parsers understand EN+RU locales",
  "Один общий poll-loop раздаёт снапшоты всем клиентам: N подключений ≠ N системных вызовов":
    "A single shared poll loop fans out snapshots to all clients: N connections ≠ N system calls",
  "Карта мира соединений на d3-geo + офлайн-геолокация по локальной .mmdb (без внешних сервисов)":
    "World map of connections on d3-geo + offline geolocation from a local .mmdb (no external services)",
  "Детекторы безопасности: evil-twin, открытые сети, выход процесса в новую страну":
    "Security detectors: evil-twin, open networks, a process reaching a new country",
  "Origin/CORS-фильтр только на localhost — чтобы сторонний сайт не прочитал список процессов":
    "Origin/CORS filter limited to localhost — so a third-party site can't read your process list",
  "Ключевой код — fan-out снапшотов многим клиентам": "Key code — fanning out snapshots to many clients",
  "Один замер раздаётся всем подписчикам через буферизованные очереди — медленный клиент не блокирует остальных.":
    "One measurement is fanned out to all subscribers via buffered queues — a slow client doesn't block the rest.",
  "Открыть на GitHub": "Open on GitHub",

  // ---- PC Health Monitor ----
  "Локальный монитор «здоровья» ПК: в реальном времени отслеживает нагрузку и учится ловить неестественную активность — скрытые майнеры, перегрев, троттлинг, деградацию диска. Активная разработка.":
    "A local PC health monitor: it tracks load in real time and learns to catch unnatural activity — hidden miners, overheating, throttling, disk degradation. Actively developed.",
  "Агент": "Agent",
  "Go + gopsutil, без cgo": "Go + gopsutil, no cgo",
  "Дашборд": "Dashboard",
  "React + Vite + собственный UI-kit": "React + Vite + custom UI kit",
  "История": "History",
  "кольцевой буфер ~24ч + JSONL с ротацией": "~24h ring buffer + rotating JSONL",
  "Инженерная деталь, которой горжусь": "An engineering detail I'm proud of",
  "Мгновенный CPU% на процесс библиотека «из коробки» считает как среднее за всю жизнь процесса — это бесполезно для детекта внезапной нагрузки. Я считаю его вручную как дельту cumulative-CPU-time между опросами, делённую на число ядер.":
    "Out of the box, the library computes per-process CPU% as an average over the whole process lifetime — useless for detecting sudden load. I compute it manually as the delta of cumulative CPU time between polls, divided by the core count.",
  "Дельта CPU-времени между двумя опросами → реальная мгновенная загрузка процесса.":
    "Delta of CPU time between two polls → the real instantaneous process load.",
  "Дальше по плану": "What's next",
  "Мост к LibreHardwareMonitor/nvidia-smi (температуры, GPU)":
    "Bridge to LibreHardwareMonitor/nvidia-smi (temperatures, GPU)",
  "SMART через smartctl": "SMART via smartctl",
  "Эвристический детектор аномалий": "Heuristic anomaly detector",
  "Опциональный AI-анализ находок через Claude API (явный opt-in, ключ только на агенте)":
    "Optional AI analysis of findings via the Claude API (explicit opt-in, key stays on the agent)",

  // ---- Repo Anti-Rot ----
  "Монитор «здоровья» и деградации репозитория. Сканирует кодовую базу на тихо накапливающийся «rot» — утёкшие секреты, заброшенные и уязвимые зависимости, стейл-ветки, стареющие TODO, мёртвый и закомментированный код, отключённые тесты, бинарный bloat — ставит балл и грейд A–F и показывает всё в дашборде. Опциональный AI-проход добавляет короткий вердикт к каждой находке через OpenRouter.":
    "A repository health and decay monitor. It scans the codebase for quietly accumulating \"rot\" — leaked secrets, abandoned and vulnerable dependencies, stale branches, aging TODOs, dead and commented-out code, disabled tests, binary bloat — assigns a score and an A–F grade, and shows it all in a dashboard. An optional AI pass adds a short verdict to each finding via OpenRouter.",
  "Сканеры": "Scanners",
  "16 независимых сканеров": "16 independent scanners",
  "46 тестовых файлов (Vitest)": "46 test files (Vitest)",
  "Оценка": "Score",
  "0–100 балл + грейд A–F": "0–100 score + A–F grade",
  "pnpm-монорепо из 4 частей: общий движок (@repo-anti-rot/core), CLI, обёртка GitHub Action и Next.js-дашборд. Работает одинаково на macOS / Linux / Windows (все пути через path/os.tmpdir, shell-агностично).":
    "A 4-part pnpm monorepo: a shared engine (@repo-anti-rot/core), a CLI, a GitHub Action wrapper and a Next.js dashboard. Works identically on macOS / Linux / Windows (all paths via path/os.tmpdir, shell-agnostic).",
  "Что проверяют 16 сканеров": "What the 16 scanners check",
  "Безопасность: committed secrets, leftover-debug, уязвимые зависимости (vulnerable-deps).":
    "Security: committed secrets, leftover debug, vulnerable dependencies (vulnerable-deps).",
  "Зависимости: outdated-deps, dependency-funeral (заброшенные), lockfile-drift.":
    "Dependencies: outdated-deps, dependency-funeral (abandoned), lockfile-drift.",
  "Мёртвый груз: dead-code, commented-code, todo-debt, repo-bloat (бинарный раздув).":
    "Dead weight: dead-code, commented-code, todo-debt, repo-bloat (binary bloat).",
  "Процесс и сообщество: stale-branch, bus-factor, project-hygiene, dockerfile, broken-doc-links, env-lifecycle.":
    "Process and community: stale-branch, bus-factor, project-hygiene, dockerfile, broken-doc-links, env-lifecycle.",
  "Архитектура: один движок, три обёртки": "Architecture: one engine, three wrappers",
  "Расширяемый реестр сканеров: каждый — чистая функция, считающая взвешенный score. CLI / Action / дашборд переиспользуют один и тот же engine.":
    "An extensible scanner registry: each is a pure function computing a weighted score. CLI / Action / dashboard reuse the same engine.",
  "В дашборде: портфель репозиториев с трендами, AI-обогащение находок через same-origin прокси к OpenRouter (ключ только в localStorage), command palette (⌘K), расписание автосканов, score-drop webhook, экспорт в Markdown/CSV/JSON. Роут /api/scan дёргает собранный CLI, чтобы клонировать и просканировать любой репозиторий.":
    "In the dashboard: a portfolio of repositories with trends, AI enrichment of findings via a same-origin proxy to OpenRouter (key kept only in localStorage), a command palette (⌘K), scheduled auto-scans, a score-drop webhook, and export to Markdown/CSV/JSON. The /api/scan route invokes the built CLI to clone and scan any repository.",

  // ---- Multi-Agent Arena ----
  "Текущий основной проект — в активной разработке. Web-приложение: мульти-модельный чат, конфигурируемые DAG-пайплайны («Арена») и симуляция событий поверх OpenRouter + локальных моделей Ollama.":
    "My current main project — actively developed. A web app: multi-model chat, configurable DAG pipelines (the \"Arena\") and event simulation on top of OpenRouter + local Ollama models.",
  "Что внутри": "What's inside",
  "Мульти-модельный чат: один промпт уходит сразу в несколько моделей — сравниваешь ответы.":
    "Multi-model chat: one prompt goes to several models at once — you compare the answers.",
  "Arena-пайплайны: строишь направленный граф (DAG) из узлов-агентов и исполняешь его движком executor.":
    "Arena pipelines: you build a directed graph (DAG) of agent nodes and run it with the executor engine.",
  "Спец-агенты с пресетами: classifier, analyst, researcher, synthesizer, summarizer (19 облачных + 5 Ollama-пресетов).":
    "Specialized agents with presets: classifier, analyst, researcher, synthesizer, summarizer (19 cloud + 5 Ollama presets).",
  "Симуляция событий: политика/экономика/военное/технологии с кросс-доменным анализом.":
    "Event simulation: politics/economics/military/technology with cross-domain analysis.",
  "Ollama local: бесплатные локальные модели (Llama, Phi, Qwen) — 100% приватно, без затрат на API.":
    "Ollama local: free local models (Llama, Phi, Qwen) — 100% private, no API cost.",
  "Оптимизация токенов: сжатие контекста, RAG, умное чтение файлов — до 80% экономии.":
    "Token optimization: context compression, RAG, smart file reading — up to 80% savings.",
  "RAG-база знаний на BM25-поиске по индексированным файлам проекта (с включением соседних чанков).":
    "A RAG knowledge base on BM25 search over indexed project files (including neighboring chunks).",
  "AI-редактирование файлов прямо из чата/пайплайна, smart-fallback на резервные модели при таймауте.":
    "AI file editing straight from the chat/pipeline, with smart fallback to backup models on timeout.",
  "Аналитика расхода: токены, оценка стоимости, графики Waterfall/Gantt.":
    "Spend analytics: tokens, cost estimates, Waterfall/Gantt charts.",
  "Telegram-бот (текст, фото, документы, голос) и система переиспользуемых скиллов (SKILL.md).":
    "A Telegram bot (text, photos, documents, voice) and a system of reusable skills (SKILL.md).",

  // ---- Vortan ----
  "Vortan — крипто-инструменты и торговые боты": "Vortan — crypto tools and trading bots",
  "Стартап, core-команда, 4+ месяца. Прошли во 2-й этап акселератора Google (ресурсы и серверные мощности на год).":
    "A startup, core team, 4+ months. We made it to stage 2 of the Google accelerator (a year of resources and server capacity).",
  "Руковожу frontend- и частично fullstack-разработкой инструментов для криптоаналитики, конструкторов стратегий, бэктестинга и AI-ботов для трейдинга.":
    "I lead the frontend and partly fullstack development of tools for crypto analytics, strategy builders, backtesting and AI trading bots.",
  "Моя зона": "My area",
  "Веб-интерфейсы конструкторов стратегий, модулей бэктестинга, аналитики, управления ботами":
    "Web interfaces for strategy builders, backtesting modules, analytics, bot management",
  "Визуализация результатов и UX-сценарии трейдера": "Result visualization and trader UX flows",
  "Backend: подключение к БД, API для исторических и live-данных рынка":
    "Backend: database connectivity, APIs for historical and live market data",
  "Realtime-слой: Binance WS/REST с авто-реконнектом": "Realtime layer: Binance WS/REST with auto-reconnect",
  "WebSocket с экспоненциальным backoff (RxJS)": "WebSocket with exponential backoff (RxJS)",
  "Авто-реконнект к Binance: при обрыве переподключаемся с растущей задержкой, не заваливая сервер.":
    "Auto-reconnect to Binance: on a drop we reconnect with growing delay, without hammering the server.",

  // ---- Chrome Extensions Suite ----
  "Сюита Chrome-расширений (MV3)": "Chrome extensions suite (MV3)",
  "Монорепо на npm workspaces (apps/*): общий стек, единый build-паттерн (Vite multi-IIFE), тёмная UI-тема и подход к безопасности. Три самостоятельных продукта — приватность, память, кастомизация UI.":
    "An npm-workspaces monorepo (apps/*): shared stack, one build pattern (Vite multi-IIFE), a dark UI theme and a common security approach. Three standalone products — privacy, memory, UI customization.",
  "TypeScript strict, чистый MV3 без сети, remote-code и eval. Всё работает 100% локально. Каждый продукт — отдельное приложение, которое можно вынести и опубликовать независимо (subtree split).":
    "TypeScript strict, pure MV3 with no network, remote code or eval. Everything runs 100% locally. Each product is a separate app that can be split out and published independently (subtree split).",
  "1. Privacy Guard — антитрекинг + анти-фингерпринт": "1. Privacy Guard — anti-tracking + anti-fingerprinting",
  "Считает «Privacy Score» страницы, блокирует трекеры и детектит попытки фингерпринтинга — canvas, WebGL, audio, navigator, screen, fonts. Ведёт историю и статистику, мастер-выключатель и пер-сайт allowlist.":
    "It computes a page \"Privacy Score\", blocks trackers and detects fingerprinting attempts — canvas, WebGL, audio, navigator, screen, fonts. Keeps history and stats, a master switch and a per-site allowlist.",
  "Content-скрипты в двух мирах: ISOLATED (мост/настройки) и MAIN (перехват fingerprint-API в контексте страницы).":
    "Content scripts in two worlds: ISOLATED (bridge/settings) and MAIN (intercepting fingerprint APIs in the page context).",
  "Блокировка через declarativeNetRequest + сигналы webRequest, per-site счётчики.":
    "Blocking via declarativeNetRequest + webRequest signals, per-site counters.",
  "Скоринговая модель с разбивкой по факторам и борьбой с false-positive.":
    "A scoring model with a per-factor breakdown and false-positive mitigation.",
  "DOM-XSS защита: экранирование данных страницы перед innerHTML в привилегированном UI.":
    "DOM-XSS protection: escaping page data before innerHTML in the privileged UI.",
  "2. TabResurrect — менеджер памяти вкладок": "2. TabResurrect — tab memory manager",
  "Усыпляет простаивающие вкладки (tabs.discard), освобождая RAM, и мгновенно восстанавливает их при возврате. Живая метрика сэкономленной памяти и пер-таб управление.":
    "It suspends idle tabs (tabs.discard) to free RAM and instantly restores them on return. A live saved-memory metric and per-tab control.",
  "chrome.tabs.discard + chrome.alarms (фоновый sweep), storage.session vs local.":
    "chrome.tabs.discard + chrome.alarms (background sweep), storage.session vs local.",
  "Самокалибрующаяся метрика: семплит system.memory до/после усыпления, отбрасывает выбросы (30–1500 МБ), после ≥3 замеров переходит с оценки на измеренное среднее для конкретной машины.":
    "A self-calibrating metric: it samples system.memory before/after suspending, discards outliers (30–1500 MB), and after ≥3 samples switches from an estimate to the measured average for that specific machine.",
  "Слоистая защита от потери данных: активная вкладка / введённый текст (formwatch content-script) / POST-навигация (webRequest) / аудио / pinned / ручной allowlist.":
    "Layered data-loss protection: active tab / entered text (formwatch content script) / POST navigation (webRequest) / audio / pinned / manual allowlist.",
  "3. Chat Skins — визуальный редактор UI веб-приложений": "3. Chat Skins — a visual UI editor for web apps",
  "Кастомизация Telegram Web / WhatsApp Web (фон чата, акцент, цвета пузырей, размеры) плюс рескин любого сайта через point-and-click инспектор.":
    "Customizing Telegram Web / WhatsApp Web (chat background, accent, bubble colors, sizes) plus reskinning any site via a point-and-click inspector.",
  "Переопределение CSS-переменных приложений (устойчиво к ребрендингу хеш-классов) + точечные селекторы.":
    "Overriding apps' CSS variables (resilient to hashed-class rebranding) + targeted selectors.",
  "Инспектор элементов в Shadow DOM + constructable stylesheets (adoptedStyleSheets / replaceSync) — обход строгого CSP (напр. YouTube).":
    "Element inspector inside Shadow DOM + constructable stylesheets (adoptedStyleSheets / replaceSync) — bypassing strict CSP (e.g. YouTube).",
  "Алгоритм гарантированно уникального селектора: readable-путь → проверка querySelectorAll → fallback на :nth-child.":
    "A guaranteed-unique selector algorithm: a readable path → querySelectorAll check → fallback to :nth-child.",
  "Мультивыбор по Ctrl/⌘ → групповой селектор; live-применение через storage.onChanged; фоны как data-URL (unlimitedStorage); миграция формата хранилища.":
    "Multi-select with Ctrl/⌘ → a group selector; live apply via storage.onChanged; backgrounds as data-URLs (unlimitedStorage); storage-format migration.",
  "Идея уникального селектора: берём читаемый путь, и если он не однозначен — добавляем :nth-child.":
    "The unique-selector idea: take a readable path, and if it's ambiguous — add :nth-child.",
  "Сквозные инженерные темы": "Cross-cutting engineering themes",
  "Chrome MV3 целиком: service worker, content-scripts (оба мира), DNR/webRequest, alarms, storage (local/session), system.memory, action popup, options page.":
    "Full Chrome MV3: service worker, content scripts (both worlds), DNR/webRequest, alarms, storage (local/session), system.memory, action popup, options page.",
  "Безопасность: изоляция миров, отсутствие сети/remote-code/eval, экранирование DOM-XSS, CSP-совместимый инжект.":
    "Security: world isolation, no network/remote-code/eval, DOM-XSS escaping, CSP-compatible injection.",
  "Инфраструктура: TypeScript strict, монорепо на workspaces, кастомный Vite-оркестратор (по сборке на entry), subtree split для выноса продукта.":
    "Infrastructure: TypeScript strict, a workspaces monorepo, a custom Vite orchestrator (one build per entry), subtree split to extract a product.",
  "UX-инжиниринг: живой предпросмотр без перезагрузки, самокалибрующиеся метрики, отказоустойчивость к динамическим SPA.":
    "UX engineering: live preview without reload, self-calibrating metrics, resilience to dynamic SPAs.",

  // ---- Repo Visualizer ----
  "Приложение на Next.js: берёт любой GitHub-репозиторий, рисует его структуру интерактивным графом и прогоняет AI-анализ кода. На вход — URL репо, на выход — наглядная карта + отчёт.":
    "A Next.js app: it takes any GitHub repository, draws its structure as an interactive graph and runs an AI code analysis. Input — a repo URL, output — a clear map + a report.",
  "Три глубины анализа: overview / structure / deep — от беглого обзора до разбора по файлам.":
    "Three analysis depths: overview / structure / deep — from a quick overview to a file-by-file breakdown.",
  "Любая модель OpenRouter настраивается через OPENROUTER_MODEL_ID (по умолчанию mistral-small).":
    "Any OpenRouter model is configurable via OPENROUTER_MODEL_ID (default mistral-small).",
  "GitHub API с опциональным токеном для повышенного лимита запросов.":
    "GitHub API with an optional token for a higher request limit.",
  "Отчёты по архитектуре, стеку и качеству кода + интерактивный граф структуры (react-xflow).":
    "Reports on architecture, stack and code quality + an interactive structure graph (react-xflow).",

  // ---- Personal Workspace ----
  "Личный кабинет с GitHub-аутентификацией": "Personal workspace with GitHub authentication",
  "Этот самый сайт. Открой панель Extensions слева (иконка с кубиками) — там вход через GitHub, заметки, календарь и задачи. Гостям всё доступно в демо-режиме (read-only), владельцу — полный CRUD.":
    "This very site. Open the Extensions panel on the left (the cubes icon) — there's GitHub login, notes, a calendar and tasks. Guests get everything in demo mode (read-only); the owner gets full CRUD.",
  "Приватный дашборд, встроенный прямо в IDE-метафору портфолио. Своя реализация OAuth-входа через GitHub (без NextAuth), разграничение прав owner/guest и хранение данных в Supabase. Цель — показать auth, работу с сессиями/токенами и аккуратное разделение доступа на реальной фиче, а не на туториале.":
    "A private dashboard embedded right into the portfolio's IDE metaphor. A hand-rolled GitHub OAuth login (no NextAuth), owner/guest access control and data stored in Supabase. The goal — to show auth, sessions/tokens and clean access separation on a real feature, not a tutorial.",
  "Аутентификация без библиотек": "Authentication without libraries",
  "GitHub OAuth вручную: authorize → callback → обмен code на access token → запрос профиля.":
    "GitHub OAuth by hand: authorize → callback → exchange code for an access token → fetch the profile.",
  "Защита от CSRF: одноразовый state в HttpOnly-cookie, сверка на колбэке.":
    "CSRF protection: a one-time state in an HttpOnly cookie, verified on the callback.",
  "Сессия — подписанный HMAC-SHA256 токен (Web Crypto) в HttpOnly+Secure+SameSite cookie. Тело cookie не доверяем без проверки подписи.":
    "The session is an HMAC-SHA256-signed token (Web Crypto) in an HttpOnly+Secure+SameSite cookie. We don't trust the cookie body without verifying the signature.",
  "Владелец определяется сравнением GitHub id с OWNER_GITHUB_ID — любой другой валидный вход остаётся гостем.":
    "The owner is determined by comparing the GitHub id with OWNER_GITHUB_ID — any other valid login stays a guest.",
  "Подпись и проверка сессии на Web Crypto — формат <payload>.<signature>, без внешних зависимостей.":
    "Signing and verifying the session with Web Crypto — format <payload>.<signature>, no external dependencies.",
  "Данные и разграничение доступа": "Data and access control",
  "Supabase (PostgREST) как бэкенд: notes / tasks / events, доступ тонким fetch-клиентом на service-role — только на сервере, в браузер ключ не попадает.":
    "Supabase (PostgREST) as the backend: notes / tasks / events, accessed by a thin fetch client with the service role — server-side only, the key never reaches the browser.",
  "Единый CRUD-роут /api/workspace/[kind]: каждый метод за requireOwner(), тела валидируются zod (whitelist полей).":
    "A single CRUD route /api/workspace/[kind]: every method behind requireOwner(), bodies validated by zod (field whitelist).",
  "RLS в Postgres включён без публичных политик: anon-ключ не читает и не пишет ничего, весь доступ — через серверную сессию.":
    "RLS in Postgres is enabled with no public policies: the anon key can't read or write anything, all access goes through the server session.",
  "Graceful degradation: без переменных окружения сайт работает как обычно, а кабинет показывает демо-данные.":
    "Graceful degradation: without env vars the site works as usual, and the workspace shows demo data.",
  "Фичи живут как вкладки внутри редактора (виртуальные «файлы»), запускаются из панели Extensions. Состояние сессии — отдельный zustand-стор, который тянет /api/auth/me и переключает интерфейс между демо и владельцем.":
    "Features live as tabs inside the editor (virtual \"files\"), launched from the Extensions panel. Session state is a separate zustand store that fetches /api/auth/me and switches the UI between demo and owner.",

  // ---- HR Search Platform ----
  "Поисковый движок по базе кандидатов (стажировка)": "Candidate-database search engine (internship)",
  "Роль: Backend / Search Engineer. HR-платформа для рекрутеров с полнотекстовым поиском по базе из 227k+ профилей кандидатов (импорт из LinkedIn-дампов). Работал с реальным продакшен-объёмом данных.":
    "Role: Backend / Search Engineer. An HR platform for recruiters with full-text search over a base of 227k+ candidate profiles (imported from LinkedIn dumps). Worked with real production-scale data.",
  "227 249 живых документов в OpenSearch 2.12 (форк Elasticsearch 7.10), PostgreSQL как источник истины. Не учебный датасет — настоящий прод-объём и настоящие «грязные» данные.":
    "227,249 live documents in OpenSearch 2.12 (a fork of Elasticsearch 7.10), PostgreSQL as the source of truth. Not a toy dataset — real production scale and real \"dirty\" data.",
  "Что сделал": "What I did",
  "🔍 Поисковый индекс и пайплайн данных": "🔍 Search index and data pipeline",
  "Развернул изолированную песочницу OpenSearch (как в проде), индекс на 227 249 реальных документов.":
    "Set up an isolated OpenSearch sandbox (prod-like), an index of 227,249 real documents.",
  "Спроектировал маппинг полей под полнотекстовый поиск: анализаторы, разделение keyword vs text, edge-ngram автокомплит по навыкам / компаниям / должностям.":
    "Designed the field mapping for full-text search: analyzers, keyword vs text separation, edge-ngram autocomplete over skills / companies / job titles.",
  "⚡ Инкрементальная синхронизация Postgres → OpenSearch": "⚡ Incremental Postgres → OpenSearch sync",
  "Переписал синхронизатор с полного reindex на инкрементальный — два независимых курсора (created_at / updated_at) с watermark из самого индекса.":
    "Rewrote the syncer from full reindex to incremental — two independent cursors (created_at / updated_at) with a watermark from the index itself.",
  "Идемпотентный upsert по стабильному ключу (urn): повторный прогон не плодит дубли.":
    "Idempotent upsert by a stable key (urn): re-running doesn't create duplicates.",
  "Результат: синк больше не перечитывает всю базу на каждом запуске.":
    "Result: the sync no longer re-reads the whole base on every run.",
  "🐛 Восстановление мёртвого фильтра по опыту": "🐛 Reviving a dead experience filter",
  "Фильтр по стажу не работал: totalExperience = 0 у всех записей. Сделал backfill (scroll + _bulk) из вложенного experience[].time; отработал грязные данные — съехавшие поля, длительность вместо дат. Фильтр по опыту стал функциональным.":
    "The seniority filter was broken: totalExperience = 0 on every record. I did a backfill (scroll + _bulk) from the nested experience[].time; handled dirty data — shifted fields, durations instead of dates. The experience filter became functional.",
  "Параллельная занятость не должна раздувать стаж. Сливаем пересекающиеся интервалы дат и считаем реально отработанные месяцы.":
    "Parallel employment shouldn't inflate seniority. We merge overlapping date intervals and count the actually worked months.",
  "📊 Оптимизация «непросмотренных кандидатов» (доказано бенчмарком)": "📊 Optimizing \"unseen candidates\" (proven by benchmark)",
  "Прод-баг: при >10k просмотренных кандидаты дублировались при прокрутке. Провёл нагрузочный бенчмарк 4 стратегий исключения на 227k (медиана 25 прогонов) и доказал замерами: exclude by _id ≈ exclude by field (выигрыша нет), а must_not деградирует линейно (36 мс + 2 МБ payload на 50k исключённых).":
    "Prod bug: with >10k viewed, candidates duplicated on scroll. I ran a load benchmark of 4 exclusion strategies on 227k (median of 25 runs) and proved by measurement: exclude by _id ≈ exclude by field (no gain), while must_not degrades linearly (36 ms + 2 MB payload at 50k excluded).",
  "Корень исходного бага: from/size + сорт без уникального тай-брейкера.":
    "Root of the original bug: from/size + a sort without a unique tie-breaker.",
  "Решение: курсорная пагинация search_after со стабильным total-order сортом → плоский took ~7 мс на любой глубине и устранение дублей by design.":
    "Solution: search_after cursor pagination with a stable total-order sort → flat took ~7 ms at any depth and duplicate elimination by design.",
  "search_after не зависит от глубины: курсор — это sort-значения предыдущей страницы, а уникальный тай-брейкер (urn) убирает дубли.":
    "search_after is depth-independent: the cursor is the previous page's sort values, and a unique tie-breaker (urn) removes duplicates.",
  "🌍 Нормализация локаций": "🌍 Location normalization",
  "Спроектировал спеку нормализации city / country / region для загрузчика: longest-match, разбор омонимов.":
    "Designed a city / country / region normalization spec for the loader: longest-match, homonym resolution.",
  "🔐 Безопасное хранение фото (Backblaze B2)": "🔐 Secure photo storage (Backblaze B2)",
  "Выдача аватаров через неугадываемый ключ (urn вместо последовательного id) — защита от перебора и массового скачивания фото.":
    "Serving avatars via an unguessable key (urn instead of a sequential id) — protection from enumeration and bulk photo scraping.",
  "Документов в индексе": "Documents in the index",
  "Пагинация на любой глубине": "Pagination at any depth",
  "~7 мс": "~7 ms",
  "Стек": "Stack",
  "OpenSearch 2.12, NestJS, Postgres": "OpenSearch 2.12, NestJS, Postgres",

  // ---- Telegram bots ----
  "Серия продакшн Telegram-ботов": "A series of production Telegram bots",
  "Роль: Backend-разработчик / разработчик Telegram-ботов. Серия прод-ботов на единой архитектуре Symfony + Doctrine + Docker. ~120 коммитов в 5 проектах.":
    "Role: Backend developer / Telegram bot developer. A series of production bots on a shared Symfony + Doctrine + Docker architecture. ~120 commits across 5 projects.",
  "Единый каркас на все боты: Symfony 7.3–8.0, Doctrine ORM 3 + Migrations, MySQL, Docker Compose, Telegram Bot API. Поверх него — разная доменная логика под каждый продукт.":
    "One framework for all bots: Symfony 7.3–8.0, Doctrine ORM 3 + Migrations, MySQL, Docker Compose, Telegram Bot API. On top of it — different domain logic per product.",
  "🤖 AI-бот генерации контента (ii-bot) — ключевой проект": "🤖 AI content-generation bot (ii-bot) — flagship project",
  "PHP 8.4, Symfony 8.0, Doctrine ORM 3, Docker, Telegram Bot API, VK API, OpenAI и внешние AI-провайдеры.":
    "PHP 8.4, Symfony 8.0, Doctrine ORM 3, Docker, Telegram Bot API, VK API, OpenAI and external AI providers.",
  "Генерация изображений и видео: text-to-video, image-to-video, reference-изображения, выбор длительности и качества вплоть до 4K.":
    "Image and video generation: text-to-video, image-to-video, reference images, choice of duration and quality up to 4K.",
  "Интеграция множества AI-моделей и провайдеров (Kling 2.1 Pro, Seedream, OpenAI и др.) с выбором модели/качества прямо из интерфейса бота.":
    "Integration of many AI models and providers (Kling 2.1 Pro, Seedream, OpenAI, etc.) with model/quality selection right from the bot UI.",
  "Режим AI deep-research (/research) и web-search инструменты для чат-бота.":
    "An AI deep-research mode (/research) and web-search tools for the chatbot.",
  "Двусторонняя интеграция Telegram ↔ VK, структурное логирование (Monolog), стабилизация генерации.":
    "Two-way Telegram ↔ VK integration, structured logging (Monolog), generation stabilization.",
  "📊 Бот автоматической email-отчётности (theact-report-bot)": "📊 Automated email-reporting bot (theact-report-bot)",
  "PHP 8.2, Symfony 7.3, Doctrine ORM 3, MySQL, IMAP, PhpSpreadsheet, OpenAI, Cron.":
    "PHP 8.2, Symfony 7.3, Doctrine ORM 3, MySQL, IMAP, PhpSpreadsheet, OpenAI, Cron.",
  "Пайплайн: IMAP-парсинг писем → извлечение Excel (PhpSpreadsheet) → анализ через OpenAI → формирование отчётов.":
    "Pipeline: IMAP email parsing → Excel extraction (PhpSpreadsheet) → analysis via OpenAI → report generation.",
  "Планировщик (Cron) с автосканом почты по расписанию и авто-отправкой отчётов.":
    "A scheduler (Cron) with scheduled mailbox auto-scan and automatic report delivery.",
  "Админ-панель управления промптами (CRUD) и система авторизации пользователей.":
    "An admin panel for managing prompts (CRUD) and a user authorization system.",
  "Аналитика: сравнение периодов (день/месяц/год), расчёт плановых показателей.":
    "Analytics: period comparison (day/month/year), target-metric calculation.",
  "🏋️ Бот фитнес-зала (gym-bot)": "🏋️ Gym bot (gym-bot)",
  "PHP 8.2, Symfony 7.3, Doctrine ORM 3, MySQL, Docker, Symfony Security.":
    "PHP 8.2, Symfony 7.3, Doctrine ORM 3, MySQL, Docker, Symfony Security.",
  "Ролевая модель доступа (admin / trainer / user) с разграничением функционала.":
    "A role-based access model (admin / trainer / user) with feature separation.",
  "CRUD-сущности (адреса, типы тренировок), управление абонементами и тренировками.":
    "CRUD entities (addresses, workout types), management of memberships and workouts.",
  "Опросы (polls), поиск по телефону, навигационное меню.":
    "Polls, phone-number lookup, a navigation menu.",
  "🛍️ Бот маркетплейса косметики (kosmetik-bot)": "🛍️ Cosmetics marketplace bot (kosmetik-bot)",
  "PHP, Symfony, Doctrine, Docker, REST-синхронизация, Cron.":
    "PHP, Symfony, Doctrine, Docker, REST sync, Cron.",
  "Команды полной и инкрементальной синхронизации каталога и изображений по Cron.":
    "Commands for full and incremental sync of the catalog and images via Cron.",
  "Система авторизации, админ-UI управления магазинами (CRUD).":
    "An authorization system, an admin UI for managing shops (CRUD).",
  "🧠 Бот психологических тестов/сценариев (manipulate-bot)": "🧠 Psychological tests/scenarios bot (manipulate-bot)",
  "PHP, Symfony, Doctrine ORM, MySQL.": "PHP, Symfony, Doctrine ORM, MySQL.",
  "Движок сценариев и тестов с сохранением ответов в БД (схема + миграции).":
    "A scenario and test engine that saves answers to the DB (schema + migrations).",
  "Админ-панель управления сценариями/вопросами (CRUD), команда статистики /usage.":
    "An admin panel for managing scenarios/questions (CRUD), a stats command /usage.",

  // ---- Browser extensions (trading) ----
  "Браузерные расширения для торговых платформ": "Browser extensions for trading platforms",
  "Chrome-расширения (Manifest V3) для TraderNet (Freedom Bank) и Binance: улучшение интерфейса, продуктивности и аналитики прямо поверх сайта биржи.":
    "Chrome extensions (Manifest V3) for TraderNet (Freedom Bank) and Binance: improving the interface, productivity and analytics right on top of the exchange site.",
  "Улучшения UI, дополнительные панели и метрики": "UI improvements, extra panels and metrics",
  "Автоматизация действий, мониторинг рынка, уведомления": "Action automation, market monitoring, notifications",
  "Интеграция с API торговых платформ": "Integration with trading-platform APIs",
  "Набор утилит: парсер данных, детектор CSS, «копировалка» интерфейсных блоков":
    "A toolset: data parser, CSS detector, a UI-block \"copier\"",
  "Кейс: Vortan Crypto Analytics (Binance overlay)": "Case study: Vortan Crypto Analytics (Binance overlay)",
  "MV3-расширение, которое считает Master Trend, полосы Боллинджера и риск-профиль портфеля 100% локально в браузере — без API-ключей биржи и без вынесения торговых данных наружу.":
    "An MV3 extension that computes Master Trend, Bollinger Bands and a portfolio risk profile 100% locally in the browser — without exchange API keys and without sending trading data anywhere.",
  "Расширение рисует поверх binance.com свой overlay с аналитикой, а лёгкий backend (Next.js + Supabase) нужен только для аккаунтов и опциональной синхронизации портфеля между устройствами.":
    "The extension draws its analytics overlay on top of binance.com, while a light backend (Next.js + Supabase) is only needed for accounts and optional cross-device portfolio sync.",
  "Passive-first сбор данных (без ключей биржи)": "Passive-first data collection (no exchange keys)",
  "Вместо API-ключей расширение пассивно наблюдает то, что страница Binance уже грузит сама: page-hook патчит fetch/XHR/WebSocket в контексте страницы и через postMessage отдаёт нужные ответы (klines, баланс, активы, PnL, открытые ордера) в content-script. Ключи и пароли биржи не нужны и не собираются.":
    "Instead of API keys, the extension passively observes what the Binance page already loads itself: a page-hook patches fetch/XHR/WebSocket in the page context and, via postMessage, hands the needed responses (klines, balance, assets, PnL, open orders) to the content script. Exchange keys and passwords are neither needed nor collected.",
  "page-hook: перехватываем ответы Binance, которые страница и так запрашивает, и пробрасываем их в расширение.":
    "page-hook: we intercept the Binance responses the page already requests and forward them to the extension.",
  "Аналитика считается локально": "Analytics is computed locally",
  "Master Trend: STL-декомпозиция дневного VWAP (тренд / сезонность / шум) с фолбэком на центрированное скользящее среднее; направление, сила тренда и «рыночный шум» — линейной регрессией по тренд-компоненте.":
    "Master Trend: STL decomposition of the daily VWAP (trend / seasonality / noise) with a fallback to a centered moving average; direction, trend strength and \"market noise\" via linear regression over the trend component.",
  "Полосы Боллинджера (20, 2σ) и band-width как мера волатильности.":
    "Bollinger Bands (20, 2σ) and band-width as a volatility measure.",
  "Риск-профиль портфеля: волатильность 30д, макс. просадка, коэффициент Шарпа, VaR 95% — по историческим ценам (CoinGecko как фолбэк-источник).":
    "Portfolio risk profile: 30d volatility, max drawdown, Sharpe ratio, 95% VaR — from historical prices (CoinGecko as a fallback source).",
  "Тяжёлые расчёты вынесены в Web Worker, прогресс — колбэками, чтобы UI не лагал на длинных историях.":
    "Heavy computations are offloaded to a Web Worker, progress via callbacks, so the UI doesn't lag on long histories.",
  "Полосы Боллинджера локально — никакого бэкенда, только массив цен.":
    "Bollinger Bands locally — no backend, just a price array.",
  "Backend и хранение": "Backend and storage",
  "Next.js API + Supabase (PostgreSQL): аккаунты и активы пользователей под Row Level Security — каждый видит только свои данные.":
    "Next.js API + Supabase (PostgreSQL): user accounts and assets under Row Level Security — everyone sees only their own data.",
  "Синхронизация портфеля не чаще раза в час, идемпотентный upsert по уникальному индексу (user_id + symbol + exchange + asset_type) — без дублей.":
    "Portfolio sync at most once an hour, idempotent upsert on a unique index (user_id + symbol + exchange + asset_type) — no duplicates.",
  "В браузере: chrome.storage.local для сессии и флагов, IndexedDB как кэш портфеля на 24 часа.":
    "In the browser: chrome.storage.local for the session and flags, IndexedDB as a 24-hour portfolio cache.",
  "Auth-bridge: отдельный content-script на лендинге логина прокидывает результат входа в расширение через postMessage → chrome.runtime.":
    "Auth bridge: a dedicated content script on the login landing forwards the sign-in result into the extension via postMessage → chrome.runtime.",

  // ---- Live files ----
  "GitHub — живые данные": "GitHub — live data",
  "Этот файл реально дёргает GitHub REST API через серверный роут Next.js (кэш 1ч, чтобы не упереться в лимит). Ниже — мои репозитории, звёзды и языки, обновляются сами.":
    "This file actually hits the GitHub REST API through a Next.js server route (1h cache to stay within the limit). Below — my repositories, stars and languages, updating on their own.",
  "Доказательство вместо слов: данные тянутся вживую при открытии файла, а не вшиты в код.":
    "Proof over words: the data is fetched live when the file opens, not hardcoded.",
  "Активность на GitHub": "GitHub activity",
  "Сетка контрибуций за последний год — тянется вживую по GitHub API при открытии файла. Наведи на клетку, чтобы увидеть число коммитов за день.":
    "A contributions grid for the past year — fetched live via the GitHub API when the file opens. Hover a cell to see the number of commits that day.",
  "Доказательство, а не скриншот: данные запрашиваются в реальном времени. Сетка умеет объединять несколько источников в один календарь (на будущее).":
    "Proof, not a screenshot: the data is requested in real time. The grid can merge several sources into one calendar (for the future).",
  "Крипторынок — realtime": "Crypto market — realtime",
  "Живые цены с Binance по WebSocket (тот же realtime-слой, что я делаю в Vortan): мультиплексированный поток, авто-реконнект с экспоненциальным backoff. Цена мигает зелёным/красным на каждом тике.":
    "Live prices from Binance over WebSocket (the same realtime layer I build at Vortan): a multiplexed stream, auto-reconnect with exponential backoff. The price flashes green/red on every tick.",
  "Это не картинка — это настоящий WebSocket к wss://stream.binance.com. Открой DevTools → Network → WS.":
    "This isn't an image — it's a real WebSocket to wss://stream.binance.com. Open DevTools → Network → WS.",

  // ---- Settings file ----
  "⚙️ Настройки сайта": "⚙️ Site settings",
  "Это настоящий settings.json с валидацией. Меняй значения — и сайт реагирует вживую: тема, размер шрифта, миникарта, сайдбар, терминал. Никакой перезагрузки.":
    "This is a real settings.json with validation. Change values and the site reacts live: theme, font size, minimap, sidebar, terminal. No reload.",
  "Попробуй: поменяй \"workbench.colorTheme\" на \"monokai\" или \"editor.fontSize\" на 18. Состояние сохраняется в localStorage.":
    "Try it: change \"workbench.colorTheme\" to \"monokai\" or \"editor.fontSize\" to 18. State is saved in localStorage.",

  // ---- AI usage / meta ----
  "🤖 Использование ИИ": "🤖 AI usage",
  "ИИ — часть моего рабочего процесса. Ниже настоящая статистика по двум инструментам: Claude Code (агент Anthropic в терминале) и OpenRouter (доступ к десяткам моделей через один API). Цифры выгружены из ccusage и из дашборда OpenRouter.":
    "AI is part of my workflow. Below are real stats for two tools: Claude Code (Anthropic's terminal agent) and OpenRouter (access to dozens of models via one API). The numbers are exported from ccusage and the OpenRouter dashboard.",
  "Это реальные экспорты на 19.06.2026, а не моковые данные. Claude Code — премиум-агент (Opus 4.8); OpenRouter — много дешёвых/бесплатных моделей для экспериментов.":
    "These are real exports as of 2026-06-19, not mock data. Claude Code is a premium agent (Opus 4.8); OpenRouter offers many cheap/free models for experiments.",

  // ---- Contact ----
  "Связаться": "Get in touch",
  "Открыт к найму в компанию, фрилансу — любому формату. Астана / удалёнка.":
    "Open to full-time, freelance — any format. Astana / remote.",
  "Форма ниже — рабочая: жмёшь «Отправить», и сообщение реально уходит через серверный API-роут Next.js с валидацией на Zod. Это и есть мини-доказательство бэкенда.":
    "The form below is real: hit \"Send\" and the message actually goes through a Next.js server API route with Zod validation. That's a little backend proof in itself.",

  // ---- Contact form (UI) ----
  "Ваше имя": "Your name",
  "как удобнее связаться": "preferred way to reach you",
  "Расскажите о вакансии или проекте…": "Tell me about the role or project…",
  "Отправить": "Send",
  "Отправлено — спасибо!": "Sent — thank you!",
  "Ошибка отправки": "Failed to send",
  "Ошибка": "Error",

  // ---- GitHub live panel ----
  "лимит запросов? попробуй позже": "rate limit? try again later",
  "Тянем живые данные из GitHub API…": "Fetching live data from the GitHub API…",
  "Языки (по репозиториям)": "Languages (by repository)",
  "Топ репозиториев": "Top repositories",

  // ---- Market live panel ----
  "Подключаемся к Binance WebSocket…": "Connecting to the Binance WebSocket…",
  "Binance недоступен из этой сети/региона — переподключаюсь автоматически.":
    "Binance isn't reachable from this network/region — reconnecting automatically.",

  // ---- Engineering journal ----
  "Инженерный журнал": "Engineering journal",
  "Живая лента того, что я делаю в коде: коммиты, PR, релизы и закрытые задачи — собирается автоматически из GitHub-активности (а для меня — ещё и из задач личного кабинета). Не статичный список проектов, а доказательство, что я стабильно пишу и поддерживаю прод.":
    "A live feed of what I'm doing in code: commits, PRs, releases and closed tasks — assembled automatically from GitHub activity (and, for me, from personal-workspace tasks too). Not a static project list, but proof that I consistently write and maintain production code.",
  "Фильтр «Только production-grade» прячет мелкий шум (chore/docs/wip/merge) и оставляет фичи, фиксы, релизы и смерженные PR. Данные тянутся вживую по GitHub API.":
    "The \"Production-grade only\" filter hides low-signal noise (chore/docs/wip/merge) and keeps features, fixes, releases and merged PRs. Data is fetched live via the GitHub API.",
  "Только production-grade": "Production-grade only",
  "событий": "events",
  "Собираю журнал из GitHub…": "Building the journal from GitHub…",
  "Не удалось загрузить ленту активности.": "Couldn't load the activity feed.",
  "Пока нет событий для показа.": "No events to show yet.",
  "Сегодня": "Today",
  "Вчера": "Yesterday",

  // ---- Repo Anti-Rot sandbox ----
  "живое демо": "live demo",
  "Репозиторий:": "Repository:",
  "Сброс": "Reset",
  "Сканирую…": "Scanning…",
  "Запустить скан": "Run scan",
  "находок": "findings",
  "Демо на фикстурах. Реальный движок клонирует и сканирует любой репозиторий через /api/scan.":
    "Demo on fixtures. The real engine clones and scans any repository via /api/scan.",
  "2 minor-версии устарели": "2 minor versions behind",
  "Не критично — обновить при случае.": "Not critical — update when convenient.",
  "3 свежих TODO": "3 fresh TODOs",
  "Молодые TODO, долговая нагрузка низкая.": "Young TODOs, low debt load.",
  "1 зависимость с CVE (high)": "1 dependency with a CVE (high)",
  "lodash <4.17.21 — обнови, есть прототайп-полюшн.": "lodash <4.17.21 — update, prototype pollution.",
  "~4% недостижимого кода": "~4% unreachable code",
  "Несколько экспортов нигде не импортируются.": "A few exports are never imported.",
  "12 блоков закомментированного кода": "12 commented-out code blocks",
  "История есть в git — можно удалить.": "History is in git — safe to delete.",
  "5 веток без активности >90 дней": "5 branches inactive >90 days",
  "Похоже на брошенные фичи.": "Looks like abandoned features.",
  "root-пользователь в контейнере": "root user in the container",
  "Добавь USER node для принципа наименьших привилегий.": "Add USER node for least privilege.",
  "AWS-ключ в истории коммитов": "AWS key in commit history",
  "Утёкший секрет — ротация ключа и git-filter обязательны.": "Leaked secret — key rotation and git-filter are a must.",
  "7 зависимостей с CVE (2 critical)": "7 dependencies with CVEs (2 critical)",
  "Старый Express + уязвимый парсер — апдейт срочно.": "Old Express + a vulnerable parser — update urgently.",
  "4 заброшенные зависимости": "4 abandoned dependencies",
  "Не обновлялись 3+ года, без активного мейнтейнера.": "No updates in 3+ years, no active maintainer.",
  "Bus-factor = 1": "Bus factor = 1",
  "80% коммитов от одного автора — риск для проекта.": "80% of commits by one author — a project risk.",
  "61 TODO, старейшему 4 года": "61 TODOs, the oldest is 4 years old",
  "Технический долг копится без разбора.": "Tech debt is piling up unaddressed.",
  "180 МБ бинарей в git": "180 MB of binaries in git",
  "Артефакты сборки в истории раздувают clone.": "Build artifacts in history bloat the clone.",
  "9 битых ссылок в доках": "9 broken links in the docs",
  "README ведёт на удалённые страницы.": "The README points to deleted pages.",

  // ---- Multi-Agent Arena sandbox ----
  "Сценарий:": "Scenario:",
  "Выполняю…": "Running…",
  "Запустить пайплайн": "Run pipeline",
  "Финальный ответ": "Final answer",
  "Принятие решения": "Decision",
  "Анализ": "Analysis",
  "Ресёрч": "Research",
  "Классифицирует запрос и выбирает маршрут": "Classifies the request and picks a route",
  "Собирает факты и контекст": "Gathers facts and context",
  "Взвешивает за/против": "Weighs pros and cons",
  "Формирует финальный ответ": "Produces the final answer",
  "Стоит ли нам мигрировать сервис сбора метрик с Node.js на Go?":
    "Should we migrate the metrics-collection service from Node.js to Go?",
  "Тип: технологическое решение": "Type: technology decision",
  "Маршрут: research → analyst → synthesizer": "Route: research → analyst → synthesizer",
  "Домен: backend / производительность": "Domain: backend / performance",
  "Текущий сервис: Node.js, ~120 МБ RSS, GC-паузы под нагрузкой": "Current service: Node.js, ~120 MB RSS, GC pauses under load",
  "Go: статический бинарь, горутины, низкий футпринт": "Go: static binary, goroutines, low footprint",
  "Команда: 2 человека уже писали агенты на Go": "Team: 2 people have already written Go agents",
  "За: latency и память, один бинарь на win/linux, конкурентность": "Pros: latency and memory, one binary for win/linux, concurrency",
  "Против: переписывание ~6 нед, экосистема npm-утилит": "Cons: ~6 weeks of rewriting, the npm utility ecosystem",
  "Риск: отвлечение от продуктовых задач": "Risk: distraction from product work",
  "Рекомендация: мигрировать поэтапно. Сначала вынести «горячий» poll-loop на Go-агент (где выигрыш по памяти и latency максимален), оставив остальной сервис на Node. Полная миграция оправдана, только если нагрузка продолжит расти — иначе ROI ниже стоимости переписывания.":
    "Recommendation: migrate incrementally. First move the hot poll loop to a Go agent (where the memory and latency gains are largest), keeping the rest of the service on Node. A full migration is justified only if load keeps growing — otherwise the ROI is below the cost of rewriting.",
  "Проанализируй запуск нового AI-продукта конкурента и его влияние на нас.":
    "Analyze a competitor's new AI product launch and its impact on us.",
  "Тип: конкурентный анализ": "Type: competitive analysis",
  "Домен: продукт / рынок": "Domain: product / market",
  "Конкурент выпустил агентный no-code пайплайн": "The competitor shipped an agentic no-code pipeline",
  "Цена ниже на 30%, но без локальных моделей": "Priced 30% lower, but without local models",
  "Активный маркетинг, +12k звёзд за месяц": "Aggressive marketing, +12k stars in a month",
  "Угроза: ценовое давление в нижнем сегменте": "Threat: price pressure in the low-end segment",
  "Наше преимущество: Ollama-локальные модели, приватность": "Our edge: local Ollama models, privacy",
  "Окно: 2-3 месяца до их фичепаритета": "Window: 2–3 months before their feature parity",
  "Вывод: не конкурировать ценой. Усилить дифференциацию на приватности и локальных моделях (то, чего у конкурента нет), ускорить релиз RAG-базы и подчеркнуть «100% офлайн» в позиционировании. Среднесрочный риск управляем при фокусе на нишу.":
    "Conclusion: don't compete on price. Strengthen differentiation on privacy and local models (which the competitor lacks), speed up the RAG knowledge-base release, and emphasize \"100% offline\" in positioning. The mid-term risk is manageable with a niche focus.",
  "Сделай краткий ресёрч по архитектурам RAG для проектного поиска.":
    "Do a brief research on RAG architectures for project search.",
  "Тип: исследовательский запрос": "Type: research request",
  "Маршрут: research → synthesizer (analyst опционально)": "Route: research → synthesizer (analyst optional)",
  "Домен: AI / поиск": "Domain: AI / search",
  "Naive RAG: эмбеддинги + top-k, прост, но теряет контекст": "Naive RAG: embeddings + top-k, simple but loses context",
  "BM25-гибрид: лексика + вектора, лучше на коде/идентификаторах": "BM25 hybrid: lexical + vectors, better on code/identifiers",
  "Re-ranking и соседние чанки повышают точность": "Re-ranking and neighboring chunks improve precision",
  "Для кодовой базы BM25-гибрид выигрывает у чистых эмбеддингов": "For a codebase, BM25 hybrid beats pure embeddings",
  "Включение соседних чанков ↑ полноту ответа": "Including neighboring chunks ↑ answer completeness",
  "Стоимость: индексация + хранение индекса": "Cost: indexing + index storage",
  "Итог: для проектного поиска по файлам оптимален BM25-гибрид с включением соседних чанков и лёгким re-ranking — это даёт точность на идентификаторах кода без дорогих векторных БД. Именно такой подход используется в RAG-базе этого проекта.":
    "Bottom line: for file-based project search, a BM25 hybrid with neighboring chunks and light re-ranking is optimal — it delivers precision on code identifiers without expensive vector DBs. That's exactly the approach used in this project's RAG base.",

  // ---- AI usage panel ----
  "Claude Code — агент, которым собран сайт": "Claude Code — the agent this site was built with",
  "OpenRouter — ассистент сайта и эксперименты с моделями":
    "OpenRouter — the site assistant and model experiments",
};

/** Translate a single string for the given language (falls back to the original). */
export function translate(lang: "ru" | "en", text: string): string {
  if (lang === "ru") return text;
  return EN[text] ?? text;
}

/** Hook returning a translate function bound to the current language. */
export function useTr() {
  const lang = useEditor((s) => s.lang);
  return (text: string) => translate(lang, text);
}
