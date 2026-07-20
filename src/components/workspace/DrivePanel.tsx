"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, RefreshCw, Search, Link2, Unlink, FileText, Folder, ExternalLink, Plus, Trash2, ChevronRight, AlertTriangle } from "lucide-react";
import { getCached, setCached, invalidate } from "@/lib/cache";
import { useSession } from "@/lib/session";

interface Source {
  id: string;
  folder_id: string;
  name: string;
  recursive: boolean;
  status: string;
  file_count: number;
  last_sync_at: string | null;
}
interface Status {
  configured: boolean;
  connected: boolean;
  account: string | null;
  avatar: string | null;
  sources: Source[];
}
interface DriveFolder { id: string; name: string; parents?: string[] }
interface IndexFile {
  id: string;
  file_id: string;
  name: string;
  mime_type: string;
  modified_time: string | null;
  web_view_link: string | null;
  excerpt: string;
}

type Tab = "files" | "folders";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function DrivePanel() {
  const owner = useSession((s) => !!s.user?.owner);
  const [status, setStatus] = useState<Status | null>(() => getCached<Status>("drive:status") ?? null);
  const [tab, setTab] = useState<Tab>("files");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatus(json as Status);
      setCached("drive:status", json);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Handle the OAuth callback result (?google=connected|error|forbidden&reason=…).
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const res = params.get("google");
    if (!res) return;
    const reason = params.get("reason");
    params.delete("google"); params.delete("reason");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    invalidate("drive:status");
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (res === "connected") setBanner({ kind: "ok", text: "Google Drive подключён." });
      else if (res === "forbidden") setBanner({ kind: "err", text: "Только владелец может подключать Google Drive." });
      else setBanner({ kind: "err", text: "Не удалось подключить Google Drive" + (reason ? `: ${decodeURIComponent(reason)}` : ".") });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!owner || getCached("drive:status")) return;
    let cancelled = false;
    (async () => { await Promise.resolve(); if (!cancelled) loadStatus(); })();
    return () => { cancelled = true; };
  }, [owner, loadStatus, banner]);

  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-5">
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright"><HardDrive size={18} /> Google Drive</h1>
        <p className="text-[13px] text-vsc-muted">Интеграция с Google Drive доступна только владельцу после входа.</p>
      </div>
    );
  }

  if (!status) {
    return <div className="mx-auto max-w-5xl px-8 py-5 text-[13px] text-vsc-muted">Загрузка Google Drive…</div>;
  }

  if (!status.configured) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-5">
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright"><HardDrive size={18} /> Google Drive</h1>
        <p className="text-[13px] leading-relaxed text-vsc-muted">
          Google OAuth не настроен. Заведи OAuth-клиент в Google Cloud Console и положи
          {" "}<code className="rounded bg-vsc-line/60 px-1">GOOGLE_CLIENT_ID</code> / <code className="rounded bg-vsc-line/60 px-1">GOOGLE_CLIENT_SECRET</code>
          {" "}в окружение. Подробно — в docs/workspace.md.
        </p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-5">
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright"><HardDrive size={18} /> Google Drive</h1>
        <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-vsc-muted">
          Подключи Google-аккаунт и выбери папки, которые станут источником для чтения и мозга.
          Файлы остаются на Диске — здесь хранится только индекс (имена, даты) и короткие выжимки текста.
        </p>
        <a href="/api/google/auth" className="inline-flex items-center gap-2 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90">
          <Link2 size={16} /> Подключить Google Drive
        </a>
        {banner && <p className={`mt-3 text-[13px] ${banner.kind === "ok" ? "text-vsc-green" : "text-vsc-yellow"}`}>{banner.text}</p>}
        {error && <p className="mt-3 text-[13px] text-vsc-yellow">{error}</p>}
      </div>
    );
  }

  return <DriveConnected status={status} tab={tab} setTab={setTab} onChange={loadStatus} />;
}

function DriveConnected({ status, tab, setTab, onChange }: { status: Status; tab: Tab; setTab: (t: Tab) => void; onChange: () => void }) {
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState("");

  async function disconnect() {
    if (!confirm("Отключить Google Drive? Индекс и выбранные папки будут удалены. Файлы на Диске не тронутся.")) return;
    invalidate("drive:status");
    invalidate("drive:files");
    await fetch("/api/google", { method: "DELETE" });
    onChange();
  }

  async function sync() {
    setSyncing(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const results: { source: string; error?: string; pending?: number }[] = json.results ?? [];
      // A source can fail on its own without failing the run — surface that.
      const failed = results.filter((r) => r.error);
      if (failed.length) setError(failed.map((r) => `${r.source}: ${r.error}`).join("; "));
      // Excerpts are time-boxed: a big folder needs several runs to finish.
      const pending = results.reduce((n, r) => n + (r.pending ?? 0), 0);
      if (pending) setNote(`Осталось дочитать ${pending} файлов — нажми «Синхронизировать» ещё раз.`);
      invalidate("drive:status");
      invalidate("drive:files");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const TABS: { key: Tab; label: string; Icon: typeof Search }[] = [
    { key: "files", label: "Файлы", Icon: FileText },
    { key: "folders", label: "Папки-источники", Icon: Folder },
  ];

  const revoked = status.sources.filter((s) => s.status === "revoked");

  return (
    <div className="mx-auto max-w-5xl px-8 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <HardDrive size={18} /> Google Drive
          {status.account && <span className="text-[13px] font-normal text-vsc-muted">· {status.account}</span>}
        </h1>
        <div className="flex items-center gap-1">
          <button onClick={sync} disabled={syncing} title="Пересобрать индекс"
            className="flex items-center gap-1 rounded p-1.5 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Синхронизация…" : "Синхронизировать"}
          </button>
          <button onClick={disconnect} title="Отключить Google Drive"
            className="flex items-center gap-1 rounded p-1.5 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
            <Unlink size={14} /> Отключить
          </button>
        </div>
      </div>

      {revoked.length > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[12px] text-vsc-yellow">
          <AlertTriangle size={14} className="shrink-0" />
          Нет доступа к папкам: {revoked.map((s) => s.name).join(", ")}. Возможно, их удалили или отозвали доступ.
        </p>
      )}

      <div className="mb-4 flex gap-1 border-b border-vsc-line">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[13px] ${tab === key ? "border-vsc-accent text-vsc-bright" : "border-transparent text-vsc-muted hover:text-vsc-text"}`}>
            <Icon size={14} /> {label}
            {key === "folders" && status.sources.length > 0 && <span className="text-[11px] text-vsc-muted">({status.sources.length})</span>}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-[13px] text-vsc-yellow">{error}</p>}
      {note && <p className="mb-3 text-[13px] text-vsc-muted">{note}</p>}
      {tab === "files" && <FilesTab sources={status.sources} onError={setError} />}
      {tab === "folders" && <FoldersTab sources={status.sources} onChange={onChange} onError={setError} />}
    </div>
  );
}

/* ---- files (search over the local index) -------------------------------- */

function FilesTab({ sources, onError }: { sources: Source[]; onError: (e: string) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<IndexFile[]>(() => getCached<IndexFile[]>("drive:files") ?? []);
  const [loading, setLoading] = useState(() => !getCached("drive:files"));
  const [open, setOpen] = useState<string | null>(null);

  const run = useCallback(async (query: string) => {
    setLoading(true);
    try {
      // An empty query returns the freshest files — cheap "recent" view.
      const res = await fetch(`/api/google/search?q=${encodeURIComponent(query || "")}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const list = (json.files as IndexFile[]) ?? [];
      setItems(list);
      if (!query) setCached("drive:files", list);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (getCached("drive:files")) return;
    let cancelled = false;
    (async () => { await Promise.resolve(); if (!cancelled) run(""); })();
    return () => { cancelled = true; };
  }, [run]);

  if (sources.length === 0) {
    return (
      <p className="text-[13px] text-vsc-muted">
        Ни одной папки не подключено. Перейди во вкладку «Папки-источники» и выбери, что индексировать.
      </p>
    );
  }

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по именам и содержимому…"
          className="flex-1 rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[13px] text-vsc-text outline-none focus:border-vsc-accent" />
        <button type="submit" className="rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90">Найти</button>
      </form>
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">Ничего не найдено. Если папку подключили только что — нажми «Синхронизировать».</p>
      ) : (
        <div className="divide-y divide-vsc-line">
          {items.map((f) => (
            <div key={f.id} className="px-1 py-2.5 hover:bg-vsc-hover">
              <div className="flex items-center gap-3">
                <FileText size={15} className="shrink-0 text-vsc-muted" />
                <button onClick={() => setOpen(open === f.id ? null : f.id)} disabled={!f.excerpt}
                  className="min-w-0 flex-1 text-left disabled:cursor-default">
                  <div className="truncate text-[13px] text-vsc-text">{f.name}</div>
                  <div className="text-[11px] text-vsc-muted">
                    {when(f.modified_time)}{f.excerpt ? "" : " · только метаданные"}
                  </div>
                </button>
                {f.web_view_link && (
                  <a href={f.web_view_link} target="_blank" rel="noreferrer" title="Открыть на Диске"
                    className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"><ExternalLink size={14} /></a>
                )}
              </div>
              {open === f.id && f.excerpt && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-vsc-sidebar px-3 py-2 text-[12px] leading-relaxed text-vsc-muted">
                  {f.excerpt}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- folders (pick what feeds the index) -------------------------------- */

function FoldersTab({ sources, onChange, onError }: { sources: Source[]; onChange: () => void; onError: (e: string) => void }) {
  const [picking, setPicking] = useState(false);

  async function remove(s: Source) {
    if (!confirm(`Отвязать папку «${s.name}»? Файлы на Диске останутся, удалится только индекс.`)) return;
    try {
      const res = await fetch(`/api/google/sources?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      invalidate("drive:status");
      invalidate("drive:files");
      onChange();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-vsc-muted">Папки, которые индексируются для чтения, поиска и мозга.</p>
        <button onClick={() => setPicking(true)}
          className="flex items-center gap-1.5 rounded bg-vsc-accent px-2.5 py-1 text-[12px] text-white hover:opacity-90">
          <Plus size={14} /> Добавить папку
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">Пока ничего не подключено.</p>
      ) : (
        <div className="divide-y divide-vsc-line">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-1 py-2.5 hover:bg-vsc-hover">
              <Folder size={15} className={`shrink-0 ${s.status === "revoked" ? "text-vsc-yellow" : "text-vsc-muted"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-vsc-text">{s.name}</div>
                <div className="text-[11px] text-vsc-muted">
                  {s.file_count} файлов
                  {s.recursive ? " · с подпапками" : ""}
                  {s.last_sync_at ? ` · синк ${when(s.last_sync_at)}` : " · ещё не синхронизировалась"}
                  {s.status === "revoked" ? " · нет доступа" : ""}
                </div>
              </div>
              <button onClick={() => remove(s)} title="Отвязать папку"
                className="shrink-0 rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-yellow"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {picking && <FolderPicker onClose={() => setPicking(false)} onAdded={onChange} onError={onError} />}
    </>
  );
}

/** Drill-down browser over Drive folders. Starts at the account's roots and
 *  walks one level at a time — Drive has no cheap "whole tree" call. */
function FolderPicker({ onClose, onAdded, onError }: { onClose: () => void; onAdded: () => void; onError: (e: string) => void }) {
  const [trail, setTrail] = useState<DriveFolder[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [recursive, setRecursive] = useState(true);
  const [adding, setAdding] = useState("");

  const current = trail[trail.length - 1] ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      const url = current ? `/api/google/folders?parent=${encodeURIComponent(current.id)}` : "/api/google/folders";
      try {
        const r = await fetch(url);
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (!cancelled) setFolders((j.folders as DriveFolder[]) ?? []);
      } catch (e) {
        if (!cancelled) onError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [current, onError]);

  async function add(f: DriveFolder) {
    setAdding(f.id);
    try {
      // The POST also runs the first sync, so this can take a while.
      const res = await fetch("/api/google/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: f.id, name: f.name, recursive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      invalidate("drive:status");
      invalidate("drive:files");
      onAdded();
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setAdding("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[70vh] w-full max-w-lg flex-col rounded border border-vsc-line bg-vsc-bg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-vsc-line px-4 py-3">
          <h2 className="mb-2 text-[14px] font-semibold text-vsc-bright">Выбери папку</h2>
          <div className="flex flex-wrap items-center gap-1 text-[12px] text-vsc-muted">
            <button onClick={() => setTrail([])} className="hover:text-vsc-text">Мой диск</button>
            {trail.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight size={12} />
                <button onClick={() => setTrail(trail.slice(0, i + 1))} className="hover:text-vsc-text">{f.name}</button>
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
          {loading ? (
            <p className="px-2 py-3 text-[13px] text-vsc-muted">Загрузка папок…</p>
          ) : folders.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-vsc-muted">Здесь нет вложенных папок.</p>
          ) : (
            folders.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded px-2 py-2 hover:bg-vsc-hover">
                <Folder size={15} className="shrink-0 text-vsc-muted" />
                <button onClick={() => setTrail([...trail, f])} className="min-w-0 flex-1 truncate text-left text-[13px] text-vsc-text">
                  {f.name}
                </button>
                <button onClick={() => add(f)} disabled={!!adding}
                  className="shrink-0 rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:text-vsc-text disabled:opacity-50">
                  {adding === f.id ? "Индексирую…" : "Выбрать"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-vsc-line px-4 py-3">
          <label className="flex items-center gap-2 text-[12px] text-vsc-muted">
            <input type="checkbox" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} />
            включая подпапки
          </label>
          <button onClick={onClose} className="rounded px-3 py-1.5 text-[13px] text-vsc-muted hover:text-vsc-text">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
