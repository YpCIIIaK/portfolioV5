import type { FileNode } from "./types";

// Shared by the portfolio, printable CV and assistant. Updated 2026-10-06.
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
  frontend: ["React 18/19", "Next.js (App Router)", "Angular", "Vue 3", "Vite", "Redux Toolkit", "Zustand", "Tailwind", "shadcn/ui", "SCSS / CSS Modules"],
  backend: ["Node.js", "NestJS", "Express", "Symfony", "Convex", "PostgreSQL", "MySQL", "Supabase", "Redis", "OpenSearch", "REST", "WebSocket"],
  cms: ["WordPress", "Custom themes", "CPT", "ACF PRO", "Gutenberg", "Contact Form 7", "Yoast", "Polylang"],
  ai: ["OpenRouter", "Multi-agent systems", "LLM tools", "Claude Code", "Cursor", "MCP"],
  infra: ["Git", "GitHub Actions", "Docker", "Vercel", "Render", "Playwright", "Vitest"],
  integrations: ["Telegram bots & Mini Apps", "Discord bots", "Chrome MV3", "Figma API"],
};

export const EXPERIENCE = [
  {
    id: "experience/factum.md", title: "Factum · Frontend / WordPress Developer",
    period: text("2026 — настоящее время · клиентские проекты", "2026 — present · client work"),
    points: [
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
      text("Бэкенд на NestJS, PostgreSQL и OpenSearch: backfill 227 000 документов и восстановление фильтра по стажу.", "NestJS, PostgreSQL and OpenSearch backend: backfilled 227,000 documents and fixed the experience range filter."),
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
    id: "projects/repo-anti-rot.ts", title: "Repo Anti-Rot", language: "TypeScript",
    summary: text("Монитор состояния репозитория: 27 полиглот-проверок, оценка A–F и приоритетный список проблем с доказательствами. CLI, GitHub Action и веб-дашборд используют общий движок.", "Repository health monitor: 27 polyglot checks, an A–F grade and a prioritized list of findings with evidence. The CLI, GitHub Action and web dashboard share one engine."),
    points: [
      text("Поиск секретов, уязвимых и заброшенных зависимостей, мёртвого кода и стареющих TODO. Публичное сканирование без аккаунта.", "Finds secrets, vulnerable and abandoned dependencies, dead code and aging TODOs. Public scans require no account."),
      text("CLI через npx repo-anti-rot, интеграция CI и экспорт SARIF. Next.js-дашборд с прогрессом сканирования и AI-рекомендациями через OpenRouter.", "CLI via npx repo-anti-rot, CI integration and SARIF export. Next.js dashboard with scan progress and AI recommendations through OpenRouter."),
      text("pnpm-монорепозиторий, регрессионные тесты Vitest и проверки ложных срабатываний.", "pnpm monorepo, Vitest regression tests and false-positive checks."),
    ],
    tech: ["TypeScript", "Next.js", "Tailwind", "shadcn/ui", "SARIF", "Vitest", "OpenRouter"],
    repo: "repo-janitor", demo: "https://repo-anti-rot.onrender.com",
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
    summary: text("Один Discord-бот с пятью ИИ-агентами: программист, инженер, исследователь, креативщик и координатор. Маршрутизация сообщений, совместные обсуждения и история в PostgreSQL / Supabase.", "One Discord bot with five AI agents: programmer, engineer, researcher, creative and coordinator. Message routing, collaborative discussions and history in PostgreSQL / Supabase."),
    points: [
      text("OpenRouter и Claude Code как провайдеры; отдельные каналы, контекст и настройки моделей для каждого агента.", "OpenRouter and Claude Code providers; individual channels, context and model settings for each agent."),
      text("Передача подзадач между агентами с сохранением состояния и защитой от циклов. Поиск в интернете и создание файлов через инструменты.", "Delegated subtasks with persisted state and loop protection. Web search and file creation through tools."),
      text("Дедупликация Discord-событий, сохраняемые лимиты и health-check Discord / БД. Развёртывание на Render.", "Discord event deduplication, persistent limits and Discord / database health checks. Deployed on Render."),
    ],
    tech: ["TypeScript", "Express", "zod", "Discord", "OpenRouter", "PostgreSQL", "Render"], repo: "ARGUS",
  },
  {
    id: "projects/bounty-scanner.ts", title: "Bounty Monitor", language: "TypeScript",
    summary: text("Ежедневный мониторинг баг-баунти: собирает данные внешних API, JSON-лент и RSS, сравнивает со снапшотом в Redis и отправляет ранжированный AI-дайджест в Discord.", "Daily bug bounty monitoring: ingests external APIs, JSON feeds and RSS, compares them with a Redis snapshot and sends a ranked AI digest to Discord."),
    points: [
      text("Cantina, Immunefi, Sherlock, Code4rena, HackenProof и RSS. Параллельный сбор через Promise.allSettled: сбой одного источника не останавливает остальные.", "Cantina, Immunefi, Sherlock, Code4rena, HackenProof and RSS. Parallel fetching with Promise.allSettled keeps one failed source from stopping the rest."),
      text("Дифф new / changed / removed по значимым полям; пустой ответ не стирает предыдущий снапшот. При сбое ИИ дайджест отправляется без AI-раздела.", "New / changed / removed diffs based on meaningful fields; empty responses do not erase the previous snapshot. If AI fails, the digest is sent without the AI section."),
      text("Vercel Cron, Upstash Redis и OpenRouter. Сценарии ошибок покрыты тестами Vitest без сетевых запросов.", "Vercel Cron, Upstash Redis and OpenRouter. Failure scenarios are covered by offline Vitest tests."),
    ],
    tech: ["Next.js", "TypeScript", "Vercel Cron", "Upstash Redis", "Discord", "OpenRouter", "Vitest"], repo: "bounty-scanner",
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
      text("Заметки, задачи, календарь, почта, Telegram, Notion, Google Drive и Bitrix24. Граф знаний, AI-воркфлоу, Repo Health и Figma → Code.", "Notes, tasks, calendar, mail, Telegram, Notion, Google Drive and Bitrix24. Knowledge graph, AI workflows, Repo Health and Figma to Code."),
    ],
    tech: ["Next.js 16", "React 19", "TypeScript", "Tailwind 4", "Zustand", "Supabase"], repo: "portfolioV5",
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
