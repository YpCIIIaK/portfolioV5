"use client";

import { useEffect, useState } from "react";
import { FolderGit2, Plus, Trash2, Pencil, Lock, Globe, ExternalLink, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { wsList, wsCreate, wsUpdate, wsDelete, DEMO_PROJECTS, type Project } from "@/lib/workspace";
import { useTr } from "@/lib/i18n";
import { GuestBanner } from "./GuestBanner";

const EMPTY = { title: "", description: "", repo_url: "", tags: "", is_public: true };

export function ProjectsPanel() {
  const tr = useTr();
  const owner = useSession((s) => !!s.user?.owner);
  const [items, setItems] = useState<Project[]>(DEMO_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  /** 401 = протухла сессия владельца: без этого запись молча пропадала. */
  const explain = (e: unknown): string =>
    (e as Error).message === "401"
      ? "Сессия истекла — войди через GitHub заново, иначе изменения не сохраняются."
      : `Не удалось сохранить (${(e as Error).message}). Проверь соединение и попробуй ещё раз.`;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await wsList<Project>("projects");
        if (alive) { setItems(rows); setDemo(false); }
      } catch {
        if (alive) { setItems(DEMO_PROJECTS); setDemo(true); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const startAdd = () => { setForm(EMPTY); setEditingId(null); setShowForm(true); };
  const startEdit = (p: Project) => {
    setForm({ title: p.title, description: p.description, repo_url: p.repo_url ?? "", tags: p.tags, is_public: p.is_public });
    setEditingId(p.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form, repo_url: form.repo_url.trim() || null };
    setError("");
    try {
      if (editingId) {
        const updated = await wsUpdate<Project>("projects", editingId, payload);
        setItems((xs) => xs.map((x) => (x.id === editingId ? updated : x)));
      } else {
        const created = await wsCreate<Project>("projects", payload);
        setItems((xs) => [created, ...xs]);
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
    } catch (e) {
      setError(explain(e));
    }
  };

  const remove = async (id: string) => {
    setError("");
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await wsDelete("projects", id);
    } catch (e) {
      setItems(prev); // удаление не прошло — возвращаем карточку
      setError(explain(e));
    }
  };

  const toggleVisibility = async (p: Project) => {
    setError("");
    try {
      const updated = await wsUpdate<Project>("projects", p.id, { is_public: !p.is_public });
      setItems((xs) => xs.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      setError(explain(e));
    }
  };

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">{tr("Загрузка проектов…")}</p>;

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      {!owner && <GuestBanner what={tr("проекты")} />}
      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">{error}</div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <FolderGit2 size={18} /> {tr("Проекты")}
          {demo && <span className="rounded bg-vsc-line px-1.5 py-0.5 text-[11px] font-normal text-vsc-muted">демо</span>}
        </h1>
        {owner && !showForm && (
          <button onClick={startAdd} className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[12px] text-white hover:opacity-90">
            <Plus size={14} /> {tr("Добавить")}
          </button>
        )}
      </div>

      {owner && showForm && (
        <div className="mb-5 space-y-2 rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-vsc-bright">{editingId ? tr("Редактировать проект") : tr("Новый проект")}</span>
            <button onClick={() => setShowForm(false)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"><X size={15} /></button>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={tr("Название")}
            className="w-full rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={tr("Описание")}
            rows={3}
            className="w-full resize-none rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          <input
            value={form.repo_url}
            onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
            placeholder={tr("Ссылка на репозиторий (опционально)")}
            className="w-full rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder={tr("Теги через запятую: React, Go, Docker")}
            className="w-full rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setForm({ ...form, is_public: !form.is_public })}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px] ${
                form.is_public ? "border-vsc-accent text-vsc-bright" : "border-vsc-line text-vsc-muted"
              }`}
            >
              {form.is_public ? <Globe size={13} /> : <Lock size={13} />}
              {form.is_public ? tr("Публичный — виден всем") : tr("Приватный — только я")}
            </button>
            <button onClick={save} className="rounded bg-vsc-accent px-4 py-1.5 text-[13px] text-white hover:opacity-90">
              {tr("Сохранить")}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">{owner ? tr("Пока нет проектов. Добавь первый.") : tr("Публичных проектов пока нет.")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="flex flex-col rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-semibold text-vsc-bright">{p.title}</h3>
                {owner && (
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                      p.is_public ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"
                    }`}
                  >
                    {p.is_public ? <Globe size={10} /> : <Lock size={10} />}
                    {p.is_public ? tr("публичный") : tr("приватный")}
                  </span>
                )}
              </div>
              {p.description && <p className="mb-2 text-[12.5px] leading-relaxed text-vsc-text">{p.description}</p>}
              {p.tags && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {p.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="rounded border border-vsc-line bg-[#2d2d2d] px-1.5 py-0.5 font-mono text-[10px] text-vsc-light-blue">{t}</span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center gap-3 pt-1">
                {p.repo_url && (
                  <a href={p.repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] text-vsc-light-blue hover:text-vsc-bright">
                    <ExternalLink size={12} /> {tr("Репозиторий")}
                  </a>
                )}
                {owner && (
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => toggleVisibility(p)} title={tr("Сменить видимость")} className="text-vsc-muted hover:text-vsc-text">
                      {p.is_public ? <Globe size={14} /> : <Lock size={14} />}
                    </button>
                    <button onClick={() => startEdit(p)} title={tr("Редактировать")} className="text-vsc-muted hover:text-vsc-text"><Pencil size={14} /></button>
                    <button onClick={() => remove(p.id)} title={tr("Удалить")} className="text-vsc-muted hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
