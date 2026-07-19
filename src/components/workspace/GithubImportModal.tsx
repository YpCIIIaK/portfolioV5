"use client";

import { useEffect, useMemo, useState } from "react";
import { X, FolderGit2, Star, Lock, GitFork, Archive, Search, Loader2, Check, Plus } from "lucide-react";
import { wsCreate, type Project } from "@/lib/workspace";

interface Repo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  private: boolean;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

/** Теги проекта из языка + топиков репозитория. */
function repoTags(r: Repo): string {
  const tags = [r.language, ...r.topics].filter(Boolean) as string[];
  return [...new Set(tags)].slice(0, 8).join(", ");
}

/**
 * Модалка импорта: тянет репозитории владельца через /api/workspace/github-repos,
 * даёт отметить нужные (уже добавленные — задизейблены) и создаёт их проектами
 * пачкой. Публичность проекта наследуется от приватности репозитория.
 */
export function GithubImportModal({
  existingUrls,
  onClose,
  onImported,
}: {
  existingUrls: Set<string>;
  onClose: () => void;
  onImported: (created: Project[]) => void;
}) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [hideForks, setHideForks] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspace/github-repos", { cache: "no-store" });
        const json = (await res.json()) as { repos?: Repo[]; error?: string };
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setRepos(json.repos ?? []);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const isAdded = (r: Repo) => existingUrls.has(r.html_url);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    return repos.filter((r) => {
      if (hideForks && r.fork) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q) || r.topics.some((t) => t.includes(q));
    });
  }, [repos, query, hideForks]);

  const selectable = filtered.filter((r) => !isAdded(r));
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.full_name));

  const toggle = (name: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAll = () =>
    setSelected((s) => {
      if (allSelected) {
        const next = new Set(s);
        for (const r of selectable) next.delete(r.full_name);
        return next;
      }
      return new Set([...s, ...selectable.map((r) => r.full_name)]);
    });

  const doImport = async () => {
    if (!repos || !selected.size) return;
    setImporting(true);
    setError("");
    const chosen = repos.filter((r) => selected.has(r.full_name));
    const created: Project[] = [];
    try {
      for (const r of chosen) {
        const p = await wsCreate<Project>("projects", {
          title: r.name,
          description: r.description ?? "",
          repo_url: r.html_url,
          tags: repoTags(r),
          is_public: !r.private,
        });
        created.push(p);
      }
      onImported(created);
    } catch (e) {
      // Часть уже могла создаться — отдаём что успели, показываем ошибку.
      if (created.length) onImported(created);
      setError(
        (e as Error).message === "401"
          ? "Сессия истекла — войди через GitHub заново."
          : `Импортировано ${created.length} из ${chosen.length}. Ошибка: ${(e as Error).message}`,
      );
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-vsc-line bg-vsc-bg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-vsc-line px-4 py-3">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-vsc-bright">
            <FolderGit2 size={17} /> Импорт из GitHub
          </span>
          <button onClick={onClose} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"><X size={16} /></button>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-vsc-line px-4 py-2.5">
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-vsc-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, описанию, топикам…"
              className="w-full rounded border border-vsc-line bg-vsc-sidebar py-1.5 pl-7 pr-2 text-[12.5px] text-vsc-text outline-none focus:border-vsc-accent"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-vsc-muted">
            <input type="checkbox" checked={hideForks} onChange={(e) => setHideForks(e.target.checked)} className="accent-(--vsc-accent,#4fc1ff)" />
            Без форков
          </label>
          <button
            onClick={toggleAll}
            disabled={!selectable.length}
            className="rounded border border-vsc-line px-2.5 py-1.5 text-[12px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          >
            {allSelected ? "Снять все" : "Выбрать все"}
          </button>
        </div>

        {error && <div className="border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-[12px] text-red-300">{error}</div>}

        {/* list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {!repos && !error && (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-vsc-muted">
              <Loader2 size={15} className="animate-spin" /> Загрузка репозиториев…
            </div>
          )}
          {repos && !filtered.length && (
            <p className="py-12 text-center text-[13px] text-vsc-muted">Ничего не найдено.</p>
          )}
          {filtered.map((r) => {
            const added = isAdded(r);
            const checked = selected.has(r.full_name);
            return (
              <button
                key={r.full_name}
                onClick={() => !added && toggle(r.full_name)}
                disabled={added}
                className={`mb-1 flex w-full items-start gap-2.5 rounded px-2 py-2 text-left ${
                  added ? "cursor-default opacity-50" : checked ? "bg-vsc-accent/15 hover:bg-vsc-accent/20" : "hover:bg-vsc-hover"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    added || checked ? "border-vsc-accent bg-vsc-accent text-white" : "border-vsc-line"
                  }`}
                >
                  {(added || checked) && <Check size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-vsc-bright">{r.name}</span>
                    {r.private && <Lock size={11} className="shrink-0 text-yellow-400" />}
                    {r.fork && <GitFork size={11} className="shrink-0 text-vsc-muted" />}
                    {r.archived && <Archive size={11} className="shrink-0 text-vsc-muted" />}
                    {added && <span className="shrink-0 text-[10px] text-vsc-muted">· уже добавлен</span>}
                  </div>
                  {r.description && <p className="truncate text-[11.5px] text-vsc-muted">{r.description}</p>}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-vsc-muted">
                    {r.language && <span>{r.language}</span>}
                    {r.stars > 0 && <span className="flex items-center gap-0.5"><Star size={10} /> {r.stars}</span>}
                    {r.topics.slice(0, 4).map((t) => (
                      <span key={t} className="rounded bg-vsc-line px-1 py-px font-mono text-vsc-light-blue">{t}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-vsc-line px-4 py-3">
          <span className="text-[12px] text-vsc-muted">Выбрано: {selected.size}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover">Отмена</button>
            <button
              onClick={doImport}
              disabled={!selected.size || importing}
              className="flex items-center gap-1.5 rounded bg-vsc-accent px-4 py-1.5 text-[12.5px] text-white hover:opacity-90 disabled:opacity-40"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Импортировать{selected.size ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
