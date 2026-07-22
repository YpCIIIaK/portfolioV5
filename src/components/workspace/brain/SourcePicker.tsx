"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Выбор конкретных материалов для точечного дополнения: файлы Диска и проекты,
 * импортированные с гитхаба.
 *
 * Обычный «Дополнить» читает выжимки с сотни файлов и описания проектов по 300
 * символов, и модель сама решает, что важно, — на большом пласте она регулярно
 * проходит мимо. Здесь выбранное читается ЦЕЛИКОМ, и промпт прямо говорит: это
 * выбрали руками, разбирай.
 *
 * Отметки по вкладкам независимы и переживают переключение — можно набрать пачку
 * файлов, уйти в проекты, добрать там и отправить всё одним заходом.
 */
export function SourcePicker({
  onClose, onConfirm,
}: {
  onClose: () => void;
  onConfirm: (fileIds: string[], projectIds: string[]) => void;
}) {
  const [tab, setTab] = useState<"drive" | "projects">("drive");
  const [files, setFiles] = useState<{ file_id: string; name: string; excerpt?: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; description: string; tags: string }[]>([]);
  const [pickedFiles, setPickedFiles] = useState<Set<string>>(new Set());
  const [pickedProjects, setPickedProjects] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const url = tab === "drive"
          ? `/api/google/search?q=${encodeURIComponent(q)}&limit=200`
          : "/api/workspace/projects";
        const res = await fetch(url);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (tab === "drive") setFiles(json.files ?? []);
        else setProjects(json.items ?? json.projects ?? []);
        setError("");
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    }, tab === "drive" && q ? 250 : 0); // дебаунс только для набора текста, первый показ — сразу
    return () => { alive = false; clearTimeout(t); };
  }, [q, tab]);

  const toggle = (set: Set<string>, apply: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    apply(next);
  };

  // Проекты фильтруем на клиенте: их десятки, отдельный серверный поиск избыточен.
  const needle = q.trim().toLowerCase();
  const shownProjects = needle
    ? projects.filter((p) => `${p.title} ${p.tags} ${p.description}`.toLowerCase().includes(needle))
    : projects;

  const total = pickedFiles.size + pickedProjects.size;

  const tabBtn = (id: "drive" | "projects", label: string, count: number) => (
    <button
      onClick={() => { setTab(id); setLoading(true); }}
      className={`rounded px-2 py-1 text-[12px] ${
        tab === id ? "bg-vsc-accent/15 text-vsc-text" : "text-vsc-muted hover:bg-vsc-hover"
      }`}
    >
      {label}{count ? ` · ${count}` : ""}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded border border-vsc-line bg-vsc-bg">
        <div className="flex items-center justify-between border-b border-vsc-line px-3 py-2">
          <span className="text-[13px] font-medium text-vsc-text">Что разобрать</span>
          <button onClick={onClose} className="text-vsc-muted hover:text-vsc-text"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-1 border-b border-vsc-line px-3 py-1.5">
          {tabBtn("drive", "Диск", pickedFiles.size)}
          {tabBtn("projects", "Проекты", pickedProjects.size)}
        </div>

        <div className="border-b border-vsc-line px-3 py-2">
          <div className="flex items-center gap-2 rounded border border-vsc-line px-2">
            <Search size={13} className="text-vsc-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "drive" ? "поиск по названию и содержимому…" : "поиск по проектам…"}
              className="w-full bg-transparent py-1 text-[12px] text-vsc-text outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading && <div className="p-3 text-[12px] text-vsc-muted">Загружаю…</div>}
          {error && <div className="p-3 text-[12px] text-red-300">{error}</div>}

          {!loading && !error && tab === "drive" && files.map((f) => (
            <button
              key={f.file_id}
              onClick={() => toggle(pickedFiles, setPickedFiles, f.file_id)}
              className={`flex w-full items-start gap-2 border-b border-vsc-line px-3 py-2 text-left hover:bg-vsc-hover ${
                pickedFiles.has(f.file_id) ? "bg-vsc-accent/10" : ""
              }`}
            >
              <input type="checkbox" checked={pickedFiles.has(f.file_id)} readOnly className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] text-vsc-text">{f.name}</span>
                {f.excerpt && (
                  <span className="block truncate text-[11px] text-vsc-muted">
                    {f.excerpt.replace(/\s+/g, " ").slice(0, 120)}
                  </span>
                )}
              </span>
            </button>
          ))}

          {!loading && !error && tab === "projects" && shownProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(pickedProjects, setPickedProjects, p.id)}
              className={`flex w-full items-start gap-2 border-b border-vsc-line px-3 py-2 text-left hover:bg-vsc-hover ${
                pickedProjects.has(p.id) ? "bg-vsc-accent/10" : ""
              }`}
            >
              <input type="checkbox" checked={pickedProjects.has(p.id)} readOnly className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] text-vsc-text">
                  {p.title}
                  {p.tags && <span className="ml-1.5 text-[11px] text-vsc-muted">{p.tags}</span>}
                </span>
                {p.description && (
                  <span className="block truncate text-[11px] text-vsc-muted">
                    {p.description.replace(/\s+/g, " ").slice(0, 120)}
                  </span>
                )}
              </span>
            </button>
          ))}

          {!loading && !error && !(tab === "drive" ? files.length : shownProjects.length) && (
            <div className="p-3 text-[12px] text-vsc-muted">Ничего не найдено.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-vsc-line px-3 py-2">
          <span className="text-[12px] text-vsc-muted">
            Выбрано: {total}
            {(pickedFiles.size > 20 || pickedProjects.size > 20) ? " — возьмём первые 20 в каждом" : ""}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded px-2 py-1 text-[12px] text-vsc-muted hover:bg-vsc-hover">
              Отмена
            </button>
            <button
              onClick={() => onConfirm([...pickedFiles], [...pickedProjects])}
              disabled={!total}
              className="rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
            >
              Дополнить выбранным
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
