"use client";

import { useCallback, useEffect, useState } from "react";
import { BookText, RefreshCw, ArrowLeft, Search, Database, Plus, ExternalLink, Link2, Unlink, FileText } from "lucide-react";
import { getCached, setCached, invalidate } from "@/lib/cache";
import { useSession } from "@/lib/session";
import { MiniMarkdown } from "./MiniMarkdown";

interface NotionConfig { tasksDbId?: string; donePropName?: string; duePropName?: string; priorityPropName?: string }
interface Status { oauthConfigured: boolean; connected: boolean; workspaceName: string | null; workspaceIcon: string | null; config: NotionConfig }
interface SearchItem { id: string; title: string; url: string | null; type: "page" | "database"; icon: string | null; editedAt: string | null }
interface Db { id: string; title: string; url: string | null }
interface PageDoc { title: string; url: string | null; markdown: string }

type Tab = "search" | "databases" | "create";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}

export function NotionPanel() {
  const owner = useSession((s) => !!s.user?.owner);
  const [status, setStatus] = useState<Status | null>(() => getCached<Status>("notion:status") ?? null);
  const [tab, setTab] = useState<Tab>("search");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/notion?scope=status");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatus(json as Status);
      setCached("notion:status", json);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!owner || getCached("notion:status")) return;
    let cancelled = false;
    (async () => { await Promise.resolve(); if (!cancelled) loadStatus(); })();
    return () => { cancelled = true; };
  }, [owner, loadStatus]);

  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright"><BookText size={18} /> Notion</h1>
        <p className="text-[13px] text-vsc-muted">Интеграция с Notion доступна только владельцу после входа.</p>
      </div>
    );
  }

  if (!status) {
    return <div className="mx-auto max-w-3xl px-8 py-5 text-[13px] text-vsc-muted">Загрузка Notion…</div>;
  }

  if (!status.oauthConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright"><BookText size={18} /> Notion</h1>
        <p className="text-[13px] leading-relaxed text-vsc-muted">
          Notion OAuth не настроен. Заполни <code className="rounded bg-vsc-line/60 px-1">NOTION_CLIENT_ID</code> и
          {" "}<code className="rounded bg-vsc-line/60 px-1">NOTION_CLIENT_SECRET</code> (и Supabase) — см. docs/workspace.md.
        </p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright"><BookText size={18} /> Notion</h1>
        <p className="mb-4 text-[13px] leading-relaxed text-vsc-muted">
          Подключи рабочее пространство Notion, чтобы искать и читать страницы, вести задачи и создавать заметки прямо отсюда.
        </p>
        <a href="/api/notion/auth" className="inline-flex items-center gap-2 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90">
          <Link2 size={16} /> Подключить Notion
        </a>
        {error && <p className="mt-3 text-[13px] text-vsc-yellow">{error}</p>}
      </div>
    );
  }

  return <NotionConnected status={status} tab={tab} setTab={setTab} onChange={loadStatus} />;
}

function NotionConnected({ status, tab, setTab, onChange }: { status: Status; tab: Tab; setTab: (t: Tab) => void; onChange: () => void }) {
  const [error, setError] = useState("");
  const [page, setPage] = useState<PageDoc | null>(null);
  const [pageLoading, setPageLoading] = useState(false);

  async function openPage(id: string) {
    setPageLoading(true);
    setPage(null);
    try {
      const res = await fetch(`/api/notion?scope=page&id=${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setPage(json.item as PageDoc);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPageLoading(false);
    }
  }

  async function disconnect() {
    invalidate("notion:status");
    invalidate("notion:search");
    invalidate("notion:databases");
    await fetch("/api/notion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
    onChange();
  }

  if (pageLoading || page) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <button onClick={() => { setPage(null); setPageLoading(false); }} className="mb-4 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text">
          <ArrowLeft size={15} /> Назад
        </button>
        {pageLoading || !page ? (
          <p className="text-[13px] text-vsc-muted">Загрузка страницы…</p>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h1 className="text-[18px] font-semibold text-vsc-bright">{page.title}</h1>
              {page.url && <a href={page.url} target="_blank" rel="noreferrer" className="shrink-0 text-vsc-muted hover:text-vsc-text"><ExternalLink size={15} /></a>}
            </div>
            {page.markdown ? <MiniMarkdown text={page.markdown} /> : <p className="text-[13px] text-vsc-muted">Пустая страница.</p>}
          </>
        )}
      </div>
    );
  }

  const TABS: { key: Tab; label: string; Icon: typeof Search }[] = [
    { key: "search", label: "Поиск", Icon: Search },
    { key: "databases", label: "Задачи · базы", Icon: Database },
    { key: "create", label: "Создать", Icon: Plus },
  ];

  return (
    <div className="mx-auto max-w-3xl px-8 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <BookText size={18} /> Notion
          {status.workspaceName && <span className="text-[13px] font-normal text-vsc-muted">· {status.workspaceIcon ?? ""} {status.workspaceName}</span>}
        </h1>
        <button onClick={disconnect} title="Отключить Notion" className="flex items-center gap-1 rounded p-1.5 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
          <Unlink size={14} /> Отключить
        </button>
      </div>

      <div className="mb-4 flex gap-1 border-b border-vsc-line">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[13px] ${tab === key ? "border-vsc-accent text-vsc-bright" : "border-transparent text-vsc-muted hover:text-vsc-text"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-[13px] text-vsc-yellow">{error}</p>}
      {tab === "search" && <SearchTab onOpen={openPage} onError={setError} />}
      {tab === "databases" && <DatabasesTab config={status.config} onSaved={onChange} onError={setError} />}
      {tab === "create" && <CreateTab config={status.config} onError={setError} onOpen={openPage} />}
    </div>
  );
}

function SearchTab({ onOpen, onError }: { onOpen: (id: string) => void; onError: (e: string) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>(() => getCached<SearchItem[]>("notion:search") ?? []);
  const [loading, setLoading] = useState(() => !getCached("notion:search"));

  const run = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notion?scope=search&q=${encodeURIComponent(query)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const list = (json.items as SearchItem[]) ?? [];
      setItems(list);
      if (!query) setCached("notion:search", list);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (getCached("notion:search")) return;
    let cancelled = false;
    (async () => { await Promise.resolve(); if (!cancelled) run(""); })();
    return () => { cancelled = true; };
  }, [run]);

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по страницам и базам…"
          className="flex-1 rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[13px] text-vsc-text outline-none focus:border-vsc-accent" />
        <button type="submit" className="rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90">Найти</button>
      </form>
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">Ничего не найдено.</p>
      ) : (
        <div className="divide-y divide-vsc-line">
          {items.map((it) => (
            <div key={it.id} className="group flex items-center gap-3 px-1 py-2.5 hover:bg-vsc-hover">
              <span className="shrink-0 text-vsc-muted">{it.type === "database" ? <Database size={15} /> : <FileText size={15} />}</span>
              <button onClick={() => it.type === "page" && onOpen(it.id)} disabled={it.type === "database"}
                className="min-w-0 flex-1 text-left disabled:cursor-default">
                <div className="truncate text-[13px] text-vsc-text">{it.icon ? `${it.icon} ` : ""}{it.title}</div>
                <div className="text-[11px] text-vsc-muted">{it.type === "database" ? "база данных" : "страница"}{it.editedAt ? ` · ${when(it.editedAt)}` : ""}</div>
              </button>
              {it.url && <a href={it.url} target="_blank" rel="noreferrer" title="Открыть в Notion" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"><ExternalLink size={14} /></a>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DatabasesTab({ config, onSaved, onError }: { config: NotionConfig; onSaved: () => void; onError: (e: string) => void }) {
  const [items, setItems] = useState<Db[]>(() => getCached<Db[]>("notion:databases") ?? []);
  const [loading, setLoading] = useState(() => !getCached("notion:databases"));
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion?scope=databases");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setItems((json.items as Db[]) ?? []);
      setCached("notion:databases", json.items);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (getCached("notion:databases")) return;
    let cancelled = false;
    (async () => { await Promise.resolve(); if (!cancelled) load(); })();
    return () => { cancelled = true; };
  }, [load]);

  async function pick(id: string) {
    setSaving(id);
    try {
      const tasksDbId = config.tasksDbId === id ? "" : id; // toggle off if same
      const res = await fetch("/api/notion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "config", tasksDbId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      invalidate("notion:status");
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving("");
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-vsc-muted">Выбери базу, из которой тянуть задачи в общий список.</p>
        <button onClick={() => { invalidate("notion:databases"); load(); }} title="Обновить" className="rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
      </div>
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">Баз данных не видно. Дай интеграции доступ к нужной базе в Notion (⋯ → Connections).</p>
      ) : (
        <div className="divide-y divide-vsc-line">
          {items.map((d) => {
            const active = config.tasksDbId === d.id;
            return (
              <div key={d.id} className="flex items-center gap-3 px-1 py-2.5 hover:bg-vsc-hover">
                <Database size={15} className="shrink-0 text-vsc-muted" />
                <div className="min-w-0 flex-1 truncate text-[13px] text-vsc-text">{d.title}</div>
                <button onClick={() => pick(d.id)} disabled={saving === d.id}
                  className={`shrink-0 rounded px-2 py-1 text-[12px] ${active ? "bg-vsc-accent text-white" : "border border-vsc-line text-vsc-muted hover:text-vsc-text"}`}>
                  {active ? "Источник задач ✓" : saving === d.id ? "…" : "Сделать задачами"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CreateTab({ config, onError, onOpen }: { config: NotionConfig; onError: (e: string) => void; onOpen: (id: string) => void }) {
  const [dbs, setDbs] = useState<Db[]>(() => getCached<Db[]>("notion:databases") ?? []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [parent, setParent] = useState(config.tasksDbId ?? "");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (getCached("notion:databases")) return;
    fetch("/api/notion?scope=databases").then((r) => r.json()).then((j) => { if (j.items) { setDbs(j.items); setCached("notion:databases", j.items); } }).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setOk("");
    try {
      const payload = parent
        ? { action: "create", title, markdown: body, parentDbId: parent }
        : { action: "create", title, markdown: body, parentPageId: undefined };
      if (!parent) { onError("Выбери базу-родитель (Notion API не даёт создавать страницы в корне)."); setBusy(false); return; }
      const res = await fetch("/api/notion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setOk("Создано ✓");
      setTitle(""); setBody("");
      const id = json.item?.id;
      if (id) setTimeout(() => onOpen(id), 400);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[12px] text-vsc-muted">В какой базе создать</label>
        <select value={parent} onChange={(e) => setParent(e.target.value)}
          className="w-full rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[13px] text-vsc-text outline-none focus:border-vsc-accent">
          <option value="">— выбери базу —</option>
          {dbs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок"
        className="w-full rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[13px] text-vsc-text outline-none focus:border-vsc-accent" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст (по абзацам)…" rows={6}
        className="w-full resize-y rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !title.trim()} className="rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90 disabled:opacity-50">
          {busy ? "Создаю…" : "Создать в Notion"}
        </button>
        {ok && <span className="text-[13px] text-vsc-green">{ok}</span>}
      </div>
    </form>
  );
}
