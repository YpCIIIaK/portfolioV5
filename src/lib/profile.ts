import type { FileNode } from "./types";

// Shared by the portfolio, printable CV and assistant. Updated 2026-10-23.
export const PROFILE_EN: Record<string, string> = {};
function text(ru: string, en: string): string {
  PROFILE_EN[ru] = en;
  return ru;
}

export const ROLE = "Frontend / Full-Stack Developer";
export const SUMMARY = text(
  "Frontend / Full-Stack разработчик с опытом 2+ года: клиентские проекты веб-агентства, HR-tech, криптостартап и собственные продукты. Создаю интерфейсы на React / Next.js и TypeScript, пишу бэкенд на Node.js / NestJS, разрабатываю ботов, Mini Apps и инструменты с ИИ.",
  "Frontend / Full-Stack developer with 2+ years across agency client work, HR-tech, a crypto startup and my own products. I build React / Next.js interfaces with TypeScript, Node.js / NestJS backends, bots, Mini Apps and AI tools.",
);
export const AVAILABILITY = text(
  "Казахстан · удалённая работа с гибким графиком. Full-time, part-time, контракт или проектная работа.",
  "Kazakhstan · remote work with a flexible schedule. Full-time, part-time, contract or project-based work.",
);
export const LANGUAGES = text("Языки: русский — родной, английский — B2+.", "Languages: Russian — native, English — B2+.");
export const CONTACTS = [
  { label: "Telegram · @bigboyvova", href: "https://t.me/bigboyvova" },
  { label: "GitHub", href: "https://github.com/YpCIIIaK" },
  { label: "Email", href: "mailto:bigboyvova01@gmail.com" },
];
export const SKILLS = {
  languages: ["TypeScript (strict)", "JavaScript", "Go", "PHP 8", "Python", "SQL"],
  frontend: ["React 18/19", "Next.js (App Router)", "Angular", "Vue 3", "Vite", "Redux Toolkit", "Zustand", "Tailwind", "shadcn/ui", "SCSS / CSS Modules", "Image & video optimization (WebP)", "Cross-browser layout"],
  backend: ["Node.js", "NestJS", "Express", "Symfony", "Convex", "PostgreSQL", "MySQL", "Supabase", "Redis", "OpenSearch", "REST", "WebSocket"],
  cms: ["WordPress", "Custom themes & plugins", "Multisite", "CPT", "ACF PRO", "Gutenberg", "Contact Form 7", "Yoast", "Polylang", "Bitrix24 webhooks"],
  ai: ["OpenRouter", "Multi-agent systems", "LLM tools", "Claude Code", "Cursor"],
  infra: ["Git", "GitHub Actions", "Docker", "Vercel", "Render", "Playwright", "Vitest"],
  integrations: ["Telegram bots & Mini Apps", "Discord bots", "Chrome MV3", "Figma API"],
};

export const EXPERIENCE = [
  {
    id: "experience/factum.md", title: "Factum · Frontend / WordPress Developer",
    period: text("2026 — настоящее время · клиентские проекты", "2026 — present · client work"),
    points: [
      text("Сайт агентства factum.agency: 51 блок для 9 отраслевых страниц (Figma → PHP-шаблоны), редизайн раздела проектов и плагин Factum Sync для мультисайта — перенёс кейсы и направления на 14 региональных сайтов и обновляю их контент из одного места.", "Agency site factum.agency: 51 blocks for 9 industry pages (Figma → PHP templates), a redesigned projects section and the Factum Sync multisite plugin — moved case studies and service pages to 14 regional sites and keep their content updated from one place."),
      text("Интеграции: формы CF7 / WooCommerce в Битрикс24 через приложение и вебхуки, заявки в Telegram, GTM + Метрика с отслеживанием форм. Внутренний AI-бот студии, Telegram-бот с каталогом техники и Telegram Mini App.", "Integrations: CF7 / WooCommerce forms to Bitrix24 via an app and webhooks, leads to Telegram, GTM + Yandex Metrica form tracking. An internal AI bot for the studio, a Telegram catalog bot and a Telegram Mini App."),
      text("Фронтенд-поддержка 7+ клиентских сайтов: исправление багов, доработка и обновление функционала и визуала.", "Front-end support for 7+ client sites: bug fixes, improvements and updates to features and visuals."),
      text("Корпоративный сайт производственной компании: работа с действующей кодовой базой (главная + 12 страниц), 11 новых секций и переработка 4 блоков. Адаптив без мобильных макетов, передача с документацией.", "Manufacturing company website: took over a live codebase (home + 12 pages), built 11 new sections and reworked 4 blocks. Responsive layouts without mobile mockups; documented handover."),
      text("Собственная WordPress-тема с нуля: шаблоны, CPT, модель контента на ACF PRO и формы CF7. Миграция файлов, БД и медиа через Docker → staging → deploy; Playwright e2e.", "Custom WordPress theme from scratch: templates, CPTs, ACF PRO content model and CF7 forms. Files, database and media migration via Docker → staging → deploy; Playwright e2e."),
      text("Технический и SEO-аудит сайта на четырёх языках: региональные страницы, Polylang, Yoast, GA4/GTM.", "Technical and SEO audit of a four-language site: regional pages, Polylang, Yoast, GA4/GTM."),
      text("Сайт медицинского центра и лендинги: сортировка, расширения админки ACF, GSAP-анимации и автоматизация на Python. Формы, адаптивная вёрстка и переключаемые кейсы на Swiper.", "Medical center website and landing pages: sorting, ACF admin extensions, GSAP animations and Python automation. Forms, responsive layouts and switchable Swiper case studies."),
    ],
  },
  {
    id: "experience/hr-search-platform.md", title: "HR-tech · Full-Stack Intern",
    period: text("Стажировка · React / NestJS / OpenSearch", "Internship · React / NestJS / OpenSearch"),
    points: [
      text("Фильтры поиска на React 18 + Redux Toolkit: состояние в URL и валидация zod. Расчёт стажа со слиянием пересекающихся интервалов.", "React 18 + Redux Toolkit search filters with URL state and zod validation. Experience calculation that merges overlapping date intervals."),
      text("Бэкенд на NestJS, PostgreSQL и OpenSearch по базе 15+ млн профилей: идемпотентный backfill 227 000 документов без дублей, проверка данных и восстановление фильтра по стажу.", "NestJS, PostgreSQL and OpenSearch backend over 15M+ candidate profiles: an idempotent backfill of 227,000 documents with no duplicates, data validation and a fixed experience range filter."),
      text("Изменения объединены в stage; GitHub Actions CI и развёртывание через ArgoCD.", "Changes merged to stage with GitHub Actions CI and ArgoCD deployment."),
    ],
  },
  {
    id: "experience/vortan.md", title: "Vortan · Frontend / Full-Stack",
    period: text("4+ месяца · core-команда стартапа", "4+ months · startup core team"),
    points: [
      text("Интерфейсы крипто-инструментов: стратегии, бэктестинг, аналитика, управление торговыми ботами и данные в реальном времени.", "Crypto tooling interfaces: strategies, backtesting, analytics, trading-bot management and real-time data."),
      text("Команда прошла во второй этап Google Accelerator.", "The team reached stage 2 of the Google Accelerator."),
    ],
  },
  {
    id: "experience/telegram-bots.md", title: "YourTar · Telegram Bot Developer",
    period: text("Около 6 месяцев · PHP / Python", "About 6 months · PHP / Python"),
    points: [text("Боты отчётности розничного магазина, онлайн-школы и учёта абонементов: административные команды, уведомления, интеграции и автоматизация отчётов.", "Bots for retail reporting, an online school and membership tracking: admin commands, notifications, integrations and automated reports.")],
  },
  {
    id: "experience/paraweb.md", title: "Paraweb · Web Developer Intern",
    period: text("1 месяц · стажировка", "1 month · internship"),
    points: [text("Frontend-фичи и исправления ошибок в production-проекте; Git-flow и code review.", "Production frontend features and bug fixes; Git-flow and code review.")],
  },
];

export const PROJECTS = [
  {
    id: "projects/repo-janitor.ts", title: "Repo Janitor", language: "TypeScript",
    summary: text("Сервис здоровья репозитория: 27 проверок в шести группах (безопасность, зависимости, CI, документация, «гниение», лишний код), оценка A–F и план исправлений по приоритету с доказательствами. Веб-скан, CLI и GitHub Action работают на одном движке.", "Repository health service: 27 checks in six families (security, dependencies, CI, docs, decay, code weight), an A–F grade and a prioritized fix plan with evidence. The web scan, CLI and GitHub Action share one engine."),
    points: [
      text("Поиск секретов, уязвимых и заброшенных зависимостей, мёртвого кода и стареющих TODO. Публичное сканирование без аккаунта.", "Finds secrets, vulnerable and abandoned dependencies, dead code and aging TODOs. Public scans require no account."),
      text("GitHub Action валит сборку ниже заданной оценки, выгружает SARIF во вкладку Security, пишет разбор в PR и обновляет бейдж. CLI через npx repo-anti-rot. AI-рекомендации через OpenRouter по согласию пользователя.", "The GitHub Action fails the build below a chosen grade, uploads SARIF to the Security tab, comments a breakdown on the PR and keeps a badge current. CLI via npx repo-anti-rot. Opt-in AI recommendations via OpenRouter."),
      text("pnpm-монорепозиторий и 1600+ unit-тестов на Vitest. Ложные срабатывания — это баги: каждое закрывается регрессионным тестом.", "pnpm monorepo with 1600+ Vitest unit tests. False positives are bugs: each one gets a regression test."),
    ],
    tech: ["TypeScript", "Next.js", "Tailwind", "shadcn/ui", "SARIF", "Vitest", "OpenRouter"],
    repo: "repo-janitor", demo: "https://repo-janitor.app",
  },
  {
    id: "projects/job-search-tool.ts", title: "JobSearchTool", language: "TypeScript",
    summary: text("Локальный агрегатор удалённых вакансий: 21 площадка, склейка дублей, скоринг по резюме и проверка «можно ли работать из Казахстана». ИИ оценивает вакансии, пишет письма и собирает резюме под вакансию.", "Local remote-job aggregator: 21 sources, cross-source de-duplication, resume-based scoring and a Kazakhstan eligibility check. AI scores jobs, writes cover letters and builds tailored resumes."),
    points: [
      text("Открытые API, RSS и публичные страницы hh, LinkedIn, Getmatch и Enbek без входа; паузы между запросами, сбой источника не ломает скан.", "Open APIs, RSS and public hh, LinkedIn, Getmatch and Enbek pages without login; throttled requests, and a failing source never breaks the scan."),
      text("ИИ через OpenRouter применяет правила отсева с цитатой-доказательством; ответы кэшируются, одна вакансия с разных площадок оценивается один раз.", "AI via OpenRouter applies plain-language reject rules with a quoted proof; verdicts are cached so the same job from different sources is scored once."),
      text("Вкладка отклика: письмо и ответы для формы, резюме под вакансию с экспортом в PDF и подготовка к интервью — только факты из резюме.", "Apply tab: a cover letter with form answers, a tailored resume with PDF export and interview prep — using only facts from the resume."),
    ],
    tech: ["Next.js 15", "React 19", "TypeScript", "Tailwind 4", "OpenRouter", "RSS"], repo: "JobSearchTool",
  },
  {
    id: "projects/hephaestus.ts", title: "Hephaestus · Multi-Agent LLM Arena", language: "TypeScript",
    summary: text("Мультиагентная LLM-среда: чат сразу с несколькими моделями и визуальный конструктор DAG-пайплайнов из агентов — классификатор, аналитик, исследователь, синтезатор.", "Multi-agent LLM workspace: chat with several models at once and a visual builder for DAG pipelines of agents — classifier, analyst, researcher, synthesizer."),
    points: [
      text("19 пресетов агентов и локальные модели через Ollama; fallback-цепочка моделей при таймауте или ошибке; dry run пайплайна.", "19 agent presets and local models via Ollama; a model fallback chain on timeout or error; pipeline dry run."),
      text("RAG на BM25, учёт токенов и стоимости с Waterfall / Gantt-графиками, skills в формате SKILL.md и Telegram-бот.", "BM25 RAG, token and cost tracking with Waterfall / Gantt charts, SKILL.md skills and a Telegram bot."),
      text("В публичном репозитории — ранняя версия.", "The public repo holds an earlier version."),
    ],
    tech: ["Next.js 16", "React 19", "TypeScript", "Zustand", "OpenRouter", "Ollama"], repo: "Hephaestus",
  },
  {
    id: "projects/yasen-store.js", title: "Ясень · 3D-магазин мебели", language: "JavaScript",
    summary: text("Демо-магазин мебели, где каждый товар можно повернуть в 3D, перекрасить и расставить в своей комнате, а шкаф — собрать в конструкторе и получить проект для производства. Все модели построены кодом: ни одной фотографии и ни одного 3D-файла.", "A demo furniture store where every item can be rotated in 3D, re-finished and placed in your room, and a wardrobe can be designed in a configurator with a production-ready project. Every model is generated in code: no photos and no 3D files."),
    points: [
      text("21 товар, конфигуратор тканей и материалов с пересчётом цены, 3D-планировщик комнаты с привязкой к сетке и подсветкой пересечений. Процедурные текстуры дерева, ткани и мрамора на canvas.", "21 products, a fabric and finish configurator with live pricing, a 3D room planner with grid snapping and collision highlighting. Procedural wood, fabric and marble textures drawn on canvas."),
      text("Конструктор корпусной мебели: 7 основ, установка в нишу по замеру, проверки прогиба полок и нагрузки на петли. Чертежи, спецификация, карты раскроя, CSV присадки и DXF для ЧПУ; расчётное ядро покрыто автотестами.", "Cabinet configurator: 7 base types, niche fitting from measurements, shelf-sag and hinge-load checks. Drawings, a parts list, cutting maps, drilling CSV and DXF for CNC; the calculation core is covered by tests."),
      text("Производительность: кадр рисуется только при изменениях, пониженное разрешение во время вращения, кэш геометрии (пересборка шкафа из 58 деталей — 3,4 мс), ленивая загрузка модулей и офлайн через service worker.", "Performance: frames render only on change, lower resolution while orbiting, a geometry cache (rebuilding a 58-part wardrobe takes 3.4 ms), lazy-loaded modules and offline support via a service worker."),
    ],
    tech: ["Three.js", "JavaScript (ES modules)", "Canvas", "SVG", "Service Worker", "node:test"],
    repo: "all-repo/tree/furniture-store", demo: "https://ypciiiak.github.io/all-repo/mebel/",
  },
  {
    id: "projects/physlab-3d.js", title: "Физлаб 3D · песочница физики", language: "JavaScript",
    summary: text("Онлайн-симулятор физики в браузере: тела, пружины, шарниры, моторы, пушка и свои сценарии. Физика на Rapier (Rust → WebAssembly), отрисовка на Three.js; есть 2D-версия на собственном движке.", "An in-browser physics sandbox: bodies, springs, joints, motors, a cannon and custom scenes. Physics on Rapier (Rust → WebAssembly), rendering with Three.js, plus a 2D version on a custom engine."),
    points: [
      text("5 форм тел, пружины, верёвки, шаровые шарниры, оси с моторами и сварка; гравитация планет, орбиты, сопротивление воздуха. 16 сценариев: дженга, домино, колыбель Ньютона, подвесной мост, катапульта, тест на 1000 тел.", "5 body shapes, springs, ropes, ball joints, motorized axles and welds; planetary gravity, orbits and air drag. 16 scenes: jenga, dominoes, Newton's cradle, a suspension bridge, a catapult and a 1000-body stress test."),
      text("Все тела одной формы рисуются одним вызовом (InstancedMesh), фиксированный шаг 60 Гц с интерполяцией для мониторов 120+ Гц, спящие тела не нагружают процессор.", "Same-shape bodies render in one draw call (InstancedMesh), a fixed 60 Hz step with interpolation for 120+ Hz displays, and sleeping bodies cost almost nothing."),
      text("Сохранение сцен в браузере, экспорт и импорт JSON, ссылка со сценой прямо в адресе, отмена и повтор.", "Scenes save in the browser, export and import as JSON, share as a link with the scene compressed into the URL, with undo and redo."),
    ],
    tech: ["Three.js", "Rapier", "WebAssembly", "JavaScript", "GitHub Pages"],
    repo: "all-repo", demo: "https://ypciiiak.github.io/all-repo/",
  },
  {
    id: "projects/readme-studio.tsx", title: "Readme Studio", language: "TypeScript React",
    summary: text("Визуальный конструктор GitHub README и редактор анимированных SVG-карточек. Работает в браузере без аккаунта и сервера; проекты сохраняются локально.", "Visual GitHub README builder and animated SVG card editor. Runs in the browser without an account or server; projects are saved locally."),
    points: [
      text("README из блоков: drag-and-drop, шаблоны, история изменений и предпросмотр GitHub в светлой и тёмной теме.", "Block-based README editing: drag-and-drop, templates, undo/redo and GitHub previews in light and dark themes."),
      text("SVG-редактор со слоями, выравниванием, градиентами, анимациями и карточками кода. Экспорт SVG, PNG и Markdown; сохранение проекта в JSON.", "SVG editor with layers, alignment, gradients, animations and code cards. SVG, PNG and Markdown export; JSON project files."),
      text("Карточки проектов в моём GitHub-профиле созданы этим инструментом.", "The project cards in my GitHub profile were created with this tool."),
    ],
    tech: ["SVG", "Animation", "Markdown", "Local storage", "GitHub Pages"],
    repo: "custom-readme", demo: "https://ypciiiak.github.io/custom-readme/",
  },
  {
    id: "projects/argus.ts", title: "ARGUS · Discord AI agents", language: "TypeScript",
    summary: text("Один Discord-бот с пятью ИИ-агентами (программист, инженер, исследователь, креативщик и координатор) и встроенным Bounty Monitor. Маршрутизация сообщений, совместные обсуждения и история в PostgreSQL / Supabase.", "One Discord bot with five AI agents (programmer, engineer, researcher, creative and coordinator) and a built-in Bounty Monitor. Message routing, collaborative discussions and history in PostgreSQL / Supabase."),
    points: [
      text("OpenRouter и Claude Code как провайдеры; отдельные каналы, контекст и настройки моделей для каждого агента.", "OpenRouter and Claude Code providers; individual channels, context and model settings for each agent."),
      text("Передача подзадач между агентами с сохранением состояния и защитой от циклов. Поиск в интернете и создание файлов через инструменты.", "Delegated subtasks with persisted state and loop protection. Web search and file creation through tools."),
      text("Bounty Monitor внутри бота: ежедневный скан Cantina, Immunefi, Sherlock, Code4rena, HackenProof и RSS, дифф new / changed / removed со снапшотом в Upstash Redis и ранжированный AI-дайджест в Discord. Сбой одного источника не останавливает остальные.", "Built-in Bounty Monitor: a daily scan of Cantina, Immunefi, Sherlock, Code4rena, HackenProof and RSS, new / changed / removed diffs against an Upstash Redis snapshot and a ranked AI digest in Discord. One failing source never stops the rest."),
      text("Дедупликация Discord-событий, сохраняемые лимиты и health-check Discord / БД. Развёртывание на Render.", "Discord event deduplication, persistent limits and Discord / database health checks. Deployed on Render."),
    ],
    tech: ["TypeScript", "Express", "zod", "Discord", "OpenRouter", "PostgreSQL", "Upstash Redis", "Vercel Cron", "Render"], repo: "ARGUS",
  },
  {
    id: "projects/cyberpath.html", title: "CyberPath", language: "HTML",
    summary: text("Бесплатная интерактивная платформа для изучения кибербезопасности в стиле TryHackMe: 14 курсов от новичка до продвинутого уровня. Без регистрации и бэкенда, всё работает в браузере.", "A free interactive cybersecurity learning platform in the style of TryHackMe: 14 courses from beginner to advanced. No sign-up and no backend — everything runs in the browser."),
    points: [
      text("Живая песочница-терминал Windows: эмулятор cmd / PowerShell с виртуальной ФС, «сетью» и реестром, Tab-автодополнение и многошаговые квесты.", "A live Windows terminal sandbox: a cmd / PowerShell emulator with a virtual file system, network and registry, Tab completion and multi-step quests."),
      text("Контент сверен с OWASP Top 10, MITRE ATT&CK, NIST SP 800-61 и CIS Benchmarks. Задания-квесты, флаги, XP, уровни, достижения и сертификаты.", "Content checked against OWASP Top 10, MITRE ATT&CK, NIST SP 800-61 and CIS Benchmarks. Quests, flags, XP, levels, achievements and certificates."),
      text("RU / EN, светлая и тёмная темы, PWA с офлайн-режимом, палитра Ctrl+K, доступность с клавиатуры. Чистые HTML / CSS / JS.", "RU / EN, light and dark themes, an offline-ready PWA, a Ctrl+K palette and keyboard accessibility. Plain HTML / CSS / JS."),
    ],
    tech: ["HTML", "CSS", "JavaScript", "PWA", "Service Worker", "GitHub Pages"],
    repo: "cyber-sec", demo: "https://ypciiiak.github.io/cyber-sec/#/",
  },
  {
    id: "projects/property-inbox.tsx", title: "Property Inbox", language: "TypeScript React",
    summary: text("Inbox для управляющих недвижимостью на React и Convex: обращения, поиск арендаторов и обновления в реальном времени. AI-агент находит арендаторов и создаёт заявки через инструменты.", "A real-time inbox for property managers built with React and Convex: tickets, tenant search and live updates. An AI agent finds tenants and opens tickets through tools."),
    points: [
      text("Пакетный импорт CSV с живым прогрессом, доска заявок и поиск арендаторов с пагинацией.", "Batched CSV import with live progress, a tickets board and paginated tenant search."),
      text("Оптимистичные обновления интерфейса, 13 backend-тестов и CI.", "Optimistic UI updates, 13 backend tests and CI."),
    ],
    tech: ["React", "TypeScript", "Convex", "AI tools", "CI"], repo: "convex-inbox",
  },
  {
    id: "projects/figma-copy.tsx", title: "Figma Copy", language: "TypeScript React",
    summary: text("Перенос Figma-дизайнов целиком или по фреймам в код с живым предпросмотром. Companion-плагин экспортирует слои и ассеты внутри Figma, обходя ограничения REST API.", "Convert complete Figma designs or selected frames into code with a live preview. A companion plugin exports layers and assets inside Figma, bypassing REST API rate limits."),
    points: [
      text("React + Tailwind, HTML, Vue SFC и React + CSS Modules; дерево слоёв, редактируемый Monaco и ZIP-экспорт.", "React + Tailwind, HTML, Vue SFC and React + CSS Modules; a layer tree, editable Monaco and ZIP export."),
      text("Auto-layout → flexbox, дизайн-токены из variables, изображения, градиенты и адаптивные constraints. Тесты конвертера на Vitest.", "Auto-layout to flexbox, design tokens from variables, images, gradients and responsive constraints. Converter tests with Vitest."),
    ],
    tech: ["React", "TypeScript", "Figma API", "Figma Plugin", "Tailwind", "Monaco", "Vitest"], repo: "figma-to-code",
  },
  {
    id: "projects/personal-workspace.tsx", title: "Portfolio IDE", language: "TypeScript React",
    summary: text("Это портфолио в формате VS Code: дерево файлов, вкладки, Ctrl+K, терминал и интерактивные песочницы. Внутри — приватный workspace с интеграциями и AI-ассистентом.", "This VS Code-inspired portfolio has a file tree, tabs, Ctrl+K, a terminal and interactive sandboxes. It also contains a private workspace with integrations and an AI assistant."),
    points: [
      text("GitHub OAuth, подписанные сессии, права владельца и гостевой демо-режим; хранение данных в Supabase.", "GitHub OAuth, signed sessions, owner permissions and a guest demo mode; data stored in Supabase."),
      text("Заметки, задачи, календарь, почта, Telegram (чаты, отправка и дублирование), Notion, Google Drive и задачи из облачного Bitrix24. «Второй мозг» — граф заметок, AI-ассистент с доступом к инструментам кабинета, анализ данных по запросу, AI-воркфлоу, Repo Health и Figma → Code.", "Notes, tasks, calendar, mail, Telegram (chats, sending and mirroring), Notion, Google Drive and tasks from cloud Bitrix24. A knowledge-graph second brain, an AI assistant with access to workspace tools, on-demand data analysis, AI workflows, Repo Health and Figma to Code."),
    ],
    tech: ["Next.js 16", "React 19", "TypeScript", "Tailwind 4", "Zustand", "Supabase"], repo: "portfolioV5", demo: "https://ypciiiak.online",
  },
];

export const projectFiles: FileNode[] = PROJECTS.map((p) => ({
  id: p.id, name: p.id.split("/").pop()!, language: p.language,
  blocks: [
    { t: "h1", text: p.title }, { t: "p", text: p.summary },
    { t: "ul", items: p.points }, { t: "tech", items: p.tech },
    { t: "links", items: [
      { label: "GitHub", href: `https://github.com/YpCIIIaK/${p.repo}` },
      ...("demo" in p && p.demo ? [{ label: text("Открыть проект", "Open project"), href: p.demo }] : []),
    ] },
  ],
}));

export const experienceFiles: FileNode[] = EXPERIENCE.map((job) => ({
  id: job.id, name: job.id.split("/").pop()!, language: "Markdown",
  blocks: [{ t: "h1", text: job.title }, { t: "p", text: job.period }, { t: "ul", items: job.points }],
}));
