"use client";

import { Newspaper, RefreshCw, Star, Globe, Sparkles, ExternalLink } from "lucide-react";
import { useEditor } from "@/lib/store";
import { useNews, newsWhen } from "./useNews";
import type { NewsHeadline, NewsRepo } from "@/lib/news";

function RepoRow({ r }: { r: NewsRepo }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-vsc-hover"
    >
      <Star size={12} className="shrink-0 text-vsc-yellow" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-vsc-text group-hover:text-vsc-bright">{r.title}</span>
      <span className="shrink-0 font-mono text-[11px] text-vsc-muted">★{r.stars.toLocaleString("ru-RU")}</span>
      {r.language && <span className="shrink-0 text-[10px] text-vsc-muted/70">{r.language}</span>}
      <ExternalLink size={11} className="shrink-0 text-vsc-muted opacity-0 group-hover:opacity-100" />
    </a>
  );
}

function HeadlineRow({ h }: { h: NewsHeadline }) {
  return (
    <a
      href={h.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-vsc-hover"
    >
      <span className="w-16 shrink-0 truncate text-[10px] uppercase text-vsc-muted">{h.source}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-vsc-text group-hover:text-vsc-bright">{h.title}</span>
      <span className="shrink-0 text-[11px] text-vsc-muted">{newsWhen(h.time)}</span>
      <ExternalLink size={11} className="shrink-0 text-vsc-muted opacity-0 group-hover:opacity-100" />
    </a>
  );
}

function Section({
  title,
  Icon,
  children,
  empty,
}: {
  title: string;
  Icon: typeof Globe;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">
        <Icon size={13} /> {title}
      </div>
      {children ?? <p className="text-[12px] text-vsc-muted/70">{empty ?? "— нет данных"}</p>}
    </div>
  );
}

export function NewsPanel() {
  const { data, loading, error, refresh } = useNews();
  const openFile = useEditor((s) => s.openFile);

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-semibold text-vsc-bright">
            <Newspaper size={22} className="text-vsc-accent" /> Новости
          </h1>
          <p className="mt-1 text-[13px] text-vsc-muted">
            Трендовые репозитории, тех-новости и AI — обновляется каждые 5 мин
          </p>
        </div>
        <button
          onClick={refresh}
          title="Обновить"
          className="rounded p-2 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !data ? (
        <p className="text-[13px] text-vsc-muted">Загружаю ленту…</p>
      ) : error && !data ? (
        <p className="text-[13px] text-vsc-yellow">{error}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="GitHub · набирают популярность" Icon={Star} empty="Репозитории не загрузились">
            {data?.repos.length ? (
              <div className="flex flex-col gap-0.5">{data.repos.map((r) => <RepoRow key={r.url} r={r} />)}</div>
            ) : null}
          </Section>

          <Section title="Технологии · мир" Icon={Globe} empty="Новости не загрузились">
            {data?.tech.length ? (
              <div className="flex flex-col gap-0.5">{data.tech.map((h) => <HeadlineRow key={h.url + h.title} h={h} />)}</div>
            ) : null}
          </Section>

          <Section title="Искусственный интеллект" Icon={Sparkles} empty="AI-новости не загрузились">
            {data?.ai.length ? (
              <div className="flex flex-col gap-0.5">{data.ai.map((h) => <HeadlineRow key={h.url + h.title} h={h} />)}</div>
            ) : null}
          </Section>
        </div>
      )}

      {data?.fetchedAt && (
        <p className="mt-6 text-[11px] text-vsc-muted/60">
          Обновлено {newsWhen(data.fetchedAt)} назад ·{" "}
          <button onClick={() => openFile("workspace/dashboard.tsx")} className="hover:text-vsc-text">
            на главной — по 2 из каждой категории
          </button>
        </p>
      )}
    </div>
  );
}

/** Compact dashboard block: 2 items per category. */
export function NewsWidget() {
  const { data, loading, error, refresh } = useNews();
  const openFile = useEditor((s) => s.openFile);

  return (
    <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-4 md:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => openFile("workspace/news.tsx")}
          className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-vsc-muted hover:text-vsc-text"
        >
          <Newspaper size={14} /> Новости
        </button>
        <button
          onClick={refresh}
          title="Обновить"
          className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !data ? (
        <p className="text-[12px] text-vsc-muted">Загрузка…</p>
      ) : error && !data ? (
        <p className="text-[12px] text-vsc-yellow">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Section title="GitHub" Icon={Star}>
            {data?.repos.slice(0, 2).map((r) => <RepoRow key={r.url} r={r} />)}
          </Section>
          <Section title="Тех" Icon={Globe}>
            {data?.tech.slice(0, 2).map((h) => <HeadlineRow key={h.url + h.title} h={h} />)}
          </Section>
          <Section title="AI" Icon={Sparkles}>
            {data?.ai.slice(0, 2).map((h) => <HeadlineRow key={h.url + h.title} h={h} />)}
          </Section>
        </div>
      )}
    </div>
  );
}
