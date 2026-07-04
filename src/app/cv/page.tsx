import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Владимир — резюме (Fullstack Developer)",
  description: "Резюме Владимира: fullstack-разработчик — React, TypeScript, Next.js, Go, Node.js, AI.",
  robots: { index: true },
};

/**
 * Print-friendly resume. "Скачать PDF" = браузерная печать в PDF: не тянем
 * PDF-генератор в зависимости, а кириллица рендерится системными шрифтами.
 */
export default function CvPage() {
  return (
    <main className="cv mx-auto max-w-[210mm] bg-white px-10 py-8 text-[13px] leading-relaxed text-neutral-900 print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { margin: 14mm; }
          .no-print { display: none !important; }
        }
        html, body { background: #fff !important; }
        .cv a { color: #1d4ed8; text-decoration: none; }
        .cv h2 { border-bottom: 1px solid #d4d4d4; }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
        <span className="text-neutral-600">Версия для печати. «Сохранить как PDF» — в диалоге печати.</span>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[13px]">← на сайт</Link>
          <PrintButton />
        </div>
      </div>

      <header className="mb-5">
        <h1 className="text-[26px] font-bold">Владимир</h1>
        <p className="text-[15px] text-neutral-700">Fullstack Developer · React / TypeScript / Next.js / Go / AI</p>
        <p className="mt-1 text-neutral-600">
          Астана, Казахстан · открыт к удалёнке ·{" "}
          <a href="mailto:bigboyvova01@gmail.com">bigboyvova01@gmail.com</a> ·{" "}
          <a href="https://github.com/YpCIIIaK">github.com/YpCIIIaK</a>
        </p>
      </header>

      <Section title="Кратко">
        <p>
          Фронтенд, выросший в фуллстек: 2+ года в пет-проектах, двух стартапах и коммерческой разработке.
          Делаю интерфейсы со сложным UX (command palette, realtime, стриминг) и бэкенд, который кормит их данными:
          Go-агенты, WebSocket-слои, интеграция LLM (OpenRouter / Claude API, RAG, мультиагентные системы).
        </p>
      </Section>

      <Section title="Стек">
        <ul className="list-disc pl-5">
          <li><b>Frontend:</b> React 18/19, TypeScript 5 (strict), Next.js (App Router), Angular 19, Vue 3, Tailwind, RxJS 7</li>
          <li><b>Backend:</b> Go (gopsutil, gorilla/websocket), Node.js, PHP 8 / Symfony 8 (Doctrine), Python</li>
          <li><b>Realtime:</b> WebSocket с авто-реконнектом (exp backoff), мультиплексирование потоков</li>
          <li><b>AI:</b> OpenRouter, Claude API, RAG, мультиагентные пайплайны</li>
          <li><b>Инфра:</b> Docker, GitHub Actions (+свой Action с SARIF), pnpm workspaces, Supabase/Postgres, MySQL</li>
        </ul>
      </Section>

      <Section title="Опыт">
        <Job
          title="Vortan — крипто-инструменты и торговые боты"
          meta="Стартап, core-команда · 4+ мес · frontend / fullstack lead"
          points={[
            "Веб-интерфейсы конструкторов стратегий, бэктестинга, аналитики и управления ботами.",
            "Realtime-слой: Binance WS/REST с авто-реконнектом (RxJS, exponential backoff).",
            "Команда прошла во 2-й этап акселератора Google (ресурсы и серверы на год).",
          ]}
        />
        <Job
          title="HR-tech: поисковый движок по базе кандидатов"
          meta="Стажировка · Backend / Search Engineer · OpenSearch, NestJS, Postgres"
          points={[
            "Индекс на 227 249 реальных документов: маппинги, анализаторы, edge-ngram автокомплит.",
            "Инкрементальный синк Postgres → OpenSearch (два курсора, идемпотентный upsert по urn).",
            "Курсорная пагинация search_after: ~7 мс на любой глубине, устранение дублей by design (доказано бенчмарком 4 стратегий).",
            "Backfill стажа для 227k документов со слиянием пересекающихся интервалов дат.",
          ]}
        />
        <Job
          title="Серия продакшн Telegram-ботов"
          meta="ООО «YourTar» · ~6 мес · PHP 8, Symfony 7.3–8.0, Doctrine, Docker"
          points={[
            "AI-бот генерации контента (изображения/видео до 4K, мульти-провайдер: Kling, Seedream, OpenAI).",
            "Бот email-отчётности: IMAP → Excel (PhpSpreadsheet) → анализ OpenAI → отчёты по Cron.",
            "Боты фитнес-зала и маркетплейса: ролевые модели, CRUD-админки, синхронизация каталогов.",
          ]}
        />
        <Job
          title="Браузерные расширения для торговых платформ"
          meta="TraderNet (Freedom Bank), Binance · Chrome MV3, TypeScript"
          points={[
            "Overlay-аналитика поверх Binance: Master Trend (STL), Боллинджер, риск-профиль — 100% локально, без API-ключей биржи.",
            "Passive-first сбор данных: page-hook перехватывает ответы, которые страница уже грузит.",
          ]}
        />
      </Section>

      <Section title="Ключевые проекты">
        <ul className="list-disc pl-5">
          <li><b>Repo Anti-Rot</b> — монитор деградации репозитория: 16+ сканеров, грейд A–F; CLI + GitHub Action + дашборд; ~237 unit-тестов.</li>
          <li><b>Hephaestus (Multi-Agent Arena)</b> — DAG-пайплайны LLM-агентов, RAG на BM25, OpenRouter + Ollama, Telegram-бот.</li>
          <li><b>WiFi Analyzer</b> — privacy-first Go-агент + React-дашборд: анализ Wi-Fi-окружения, fan-out снапшотов N клиентам, детекторы evil-twin.</li>
          <li><b>PC Health Monitor</b> — realtime-монитор ПК: мгновенный CPU% как дельта cumulative-time, кольцевой буфер ~24ч.</li>
          <li><b>Это портфолио</b> — Next.js 16 «VSCode»: свой GitHub OAuth (HMAC-cookie), Supabase, IMAP-почта, AI-ассистент.</li>
        </ul>
      </Section>

      <Section title="Образование">
        <p>
          «Программная инженерия», ТУСУР (ожидаемое окончание — 2028). Стипендиальные IT-программы в ТГУ и AITU.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 pb-1 text-[15px] font-semibold uppercase tracking-wide text-neutral-800">{title}</h2>
      {children}
    </section>
  );
}

function Job({ title, meta, points }: { title: string; meta: string; points: string[] }) {
  return (
    <div className="mb-3">
      <div className="font-semibold">{title}</div>
      <div className="text-[12px] text-neutral-500">{meta}</div>
      <ul className="mt-1 list-disc pl-5">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
