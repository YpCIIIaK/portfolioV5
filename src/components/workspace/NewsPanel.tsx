"use client";

import { useState } from "react";
import { Newspaper, RefreshCw, Star, Globe, Sparkles, ExternalLink, ArrowLeft } from "lucide-react";
import { useEditor } from "@/lib/store";
import { useNews, newsWhen } from "./useNews";
import type { NewsHeadline, NewsRepo, NewsSelection } from "@/lib/news";

function RepoCard({ r, compact, active, onOpen }: { r: NewsRepo; compact?: boolean; active?: boolean; onOpen?: () => void }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Star size={compact ? 12 : 14} className="mt-0.5 shrink-0 text-vsc-yellow" />
          <span className={`leading-snug text-vsc-text ${compact ? "line-clamp-2 text-[12px]" : "text-[14px]"}`}>{r.title}</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-vsc-muted">★{r.stars.toLocaleString("ru-RU")}</span>
      </div>
      {!compact && r.description && (
        <p className="mt-1.5 pl-6 text-[13px] leading-relaxed text-vsc-muted line-clamp-2">{r.description}</p>
      )}
      {!compact && (
        <div className="mt-1 pl-6 text-[11px] text-vsc-muted/70">
          {r.language && <span>{r.language}</span>}
        </div>
      )}
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
          active ? "border-vsc-accent/50 bg-vsc-accent/10" : "border-vsc-line/60 hover:border-vsc-line hover:bg-vsc-hover"
        }`}
      >
        {body}
      </button>
    );
  }

  return (
    <a href={r.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-vsc-line/60 px-3 py-2.5 hover:bg-vsc-hover">
      {body}
    </a>
  );
}

function HeadlineCard({
  h,
  compact,
  active,
  onOpen,
}: {
  h: NewsHeadline;
  compact?: boolean;
  active?: boolean;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-vsc-muted">{h.source}</span>
        <span className="shrink-0 text-[11px] text-vsc-muted">{newsWhen(h.time)}</span>
      </div>
      <p className={`leading-snug text-vsc-bright ${compact ? "line-clamp-2 text-[12px]" : "text-[14px]"}`}>{h.title}</p>
      {!compact && h.description && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-vsc-muted line-clamp-3">{h.description}</p>
      )}
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
          active ? "border-vsc-accent/50 bg-vsc-accent/10" : "border-vsc-line/60 hover:border-vsc-line hover:bg-vsc-hover"
        }`}
      >
        {body}
      </button>
    );
  }

  return (
    <a href={h.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-vsc-line/60 px-3 py-2.5 hover:bg-vsc-hover">
      {body}
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
    <section>
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">
        <Icon size={13} /> {title}
      </div>
      {children ?? <p className="text-[12px] text-vsc-muted/70">{empty ?? "— нет данных"}</p>}
    </section>
  );
}

function NewsDetail({ selected, onBack }: { selected: NewsSelection; onBack: () => void }) {
  const { kind, item } = selected;

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text"
      >
        <ArrowLeft size={15} /> К списку
      </button>

      <article className="rounded-lg border border-vsc-line bg-vsc-sidebar p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-vsc-muted">
          {kind === "repo" ? <Star size={14} className="text-vsc-yellow" /> : <Globe size={14} />}
          {kind === "repo" ? (
            <>
              {item.language && <span>{item.language}</span>}
              <span>★ {item.stars.toLocaleString("ru-RU")}</span>
            </>
          ) : (
            <>
              <span>{item.source}</span>
              {item.time && <span>{newsWhen(item.time)} назад</span>}
            </>
          )}
        </div>

        <h1 className="text-[20px] font-semibold leading-snug text-vsc-bright">{item.title}</h1>

        {item.description ? (
          <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-vsc-text">{item.description}</p>
        ) : (
          <p className="mt-4 text-[14px] text-vsc-muted">Краткое описание недоступно — открой оригинал.</p>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90"
        >
          {kind === "repo" ? "Открыть на GitHub" : "Читать оригинал"} <ExternalLink size={14} />
        </a>
      </article>
    </div>
  );
}

export function NewsPanel() {
  const { data, loading, error, refresh } = useNews();
  const openFile = useEditor((s) => s.openFile);
  const [selected, setSelected] = useState<NewsSelection | null>(null);

  if (selected) {
    return <NewsDetail selected={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-vsc-bright">
            <Newspaper size={20} className="text-vsc-accent" /> Новости
          </h1>
          <p className="mt-1 text-[13px] text-vsc-muted">Нажми на новость, чтобы прочитать описание</p>
        </div>
        <button
          type="button"
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
        <div className="flex flex-col gap-8">
          <Section title="GitHub · набирают популярность" Icon={Star} empty="Репозитории не загрузились">
            {data?.repos.length ? (
              <div className="flex flex-col gap-2">
                {data.repos.map((r) => (
                  <RepoCard key={r.url} r={r} onOpen={() => setSelected({ kind: "repo", item: r })} />
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Технологии · мир" Icon={Globe} empty="Новости не загрузились">
            {data?.tech.length ? (
              <div className="flex flex-col gap-2">
                {data.tech.map((h) => (
                  <HeadlineCard key={h.id} h={h} onOpen={() => setSelected({ kind: "headline", item: h })} />
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Искусственный интеллект" Icon={Sparkles} empty="AI-новости не загрузились">
            {data?.ai.length ? (
              <div className="flex flex-col gap-2">
                {data.ai.map((h) => (
                  <HeadlineCard key={h.id} h={h} onOpen={() => setSelected({ kind: "headline", item: h })} />
                ))}
              </div>
            ) : null}
          </Section>
        </div>
      )}

      {data?.fetchedAt && (
        <p className="mt-8 text-[11px] text-vsc-muted/60">
          Обновлено {newsWhen(data.fetchedAt)} назад ·{" "}
          <button type="button" onClick={() => openFile("workspace/dashboard.tsx")} className="hover:text-vsc-text">
            на главной — по 2 из каждой категории
          </button>
        </p>
      )}
    </div>
  );
}

/** Compact dashboard block: 2 items per category, full-width rows. */
export function NewsWidget() {
  const { data, loading, error, refresh } = useNews();
  const openFile = useEditor((s) => s.openFile);

  return (
    <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-4 md:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => openFile("workspace/news.tsx")}
          className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-vsc-muted hover:text-vsc-text"
        >
          <Newspaper size={14} /> Новости
        </button>
        <button
          type="button"
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
        <div className="flex flex-col gap-5">
          <Section title="GitHub" Icon={Star}>
            <div className="flex flex-col gap-1.5">
              {data?.repos.slice(0, 2).map((r) => (
                <RepoCard key={r.url} r={r} compact onOpen={() => openFile("workspace/news.tsx")} />
              ))}
            </div>
          </Section>
          <Section title="Тех" Icon={Globe}>
            <div className="flex flex-col gap-1.5">
              {data?.tech.slice(0, 2).map((h) => (
                <HeadlineCard key={h.id} h={h} compact onOpen={() => openFile("workspace/news.tsx")} />
              ))}
            </div>
          </Section>
          <Section title="AI" Icon={Sparkles}>
            <div className="flex flex-col gap-1.5">
              {data?.ai.slice(0, 2).map((h) => (
                <HeadlineCard key={h.id} h={h} compact onOpen={() => openFile("workspace/news.tsx")} />
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
