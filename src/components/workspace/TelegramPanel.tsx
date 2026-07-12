"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Send, RefreshCw, User, Users, Radio, Play, Paperclip, X, Clock, FileText } from "lucide-react";
import { getCached, setCached, invalidate } from "@/lib/cache";

/** Client-side mirrors of /api/telegram shapes. */
interface TgDialog { id: string; title: string; kind: "user" | "group" | "channel"; unread: number; lastMessage: string; lastDate: string | null }
interface TgMedia { kind: string; display: "image" | "video" | "audio" }
interface TgMessage { id: number; out: boolean; author: string; text: string; date: string; media: TgMedia | null }
/** Locally-shown, not-yet-confirmed outgoing message (optimistic echo). */
interface Pending { localId: number; text: string; note?: string }

/** Merge server messages into existing ones, dedup by id, sorted oldest→newest. */
function mergeMsgs(prev: TgMessage[], incoming: TgMessage[]): TgMessage[] {
  const map = new Map<number, TgMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

const PAGE = 40;

// How often to re-poll the currently open chat (adaptive: only while it's open).
const CHAT_POLL_MS = 3000;

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}

function KindIcon({ kind }: { kind: TgDialog["kind"] }) {
  const Icon = kind === "channel" ? Radio : kind === "group" ? Users : User;
  return <Icon size={14} className="shrink-0 text-vsc-muted" />;
}

async function getJson<T>(qs: string): Promise<T> {
  const res = await fetch(`/api/telegram?${qs}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.items as T;
}

/** Renders one message attachment inline. Video loads only on user action. */
function MediaView({ peer, msgId, media }: { peer: string; msgId: number; media: TgMedia }) {
  const [play, setPlay] = useState(false);
  const src = `/api/telegram/media?peer=${encodeURIComponent(peer)}&id=${msgId}`;
  const round = media.kind === "videoNote";

  if (media.display === "image") {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`my-1 max-h-72 object-cover ${round ? "h-40 w-40 rounded-full" : "max-w-full rounded-lg"}`}
        />
      </a>
    );
  }

  if (media.display === "video") {
    if (!play) {
      return (
        <button
          onClick={() => setPlay(true)}
          className={`my-1 flex items-center justify-center bg-black/40 text-white ${round ? "h-40 w-40 rounded-full" : "h-40 w-56 max-w-full rounded-lg"}`}
        >
          <Play size={28} />
        </button>
      );
    }
    return (
      <video
        src={src}
        controls
        autoPlay
        playsInline
        loop={round || media.kind === "gif"}
        className={`my-1 max-h-80 ${round ? "h-40 w-40 rounded-full object-cover" : "max-w-full rounded-lg"}`}
      />
    );
  }

  // audio (voice / music)
  return <audio src={src} controls preload="none" className="my-1 max-w-full" />;
}

export function TelegramPanel() {
  const [dialogs, setDialogs] = useState<TgDialog[]>(() => getCached<TgDialog[]>("tg:dialogs") ?? []);
  const [loading, setLoading] = useState(() => !getCached("tg:dialogs"));
  const [error, setError] = useState("");
  const [fetchKey, setFetchKey] = useState(0);

  // open dialog
  const [openChat, setOpenChat] = useState<TgDialog | null>(null);
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);
  const olderBusyRef = useRef(false);
  const prependRef = useRef<{ h: number; top: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- dialog list ---- */
  useEffect(() => {
    if (getCached("tg:dialogs")) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await getJson<TgDialog[]>("scope=dialogs");
        if (!cancelled) { setDialogs(d); setCached("tg:dialogs", d); }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchKey]);

  const forceReload = useCallback(() => {
    invalidate("tg:dialogs");
    setLoading(true);
    setError("");
    setFetchKey((k) => k + 1);
  }, []);

  /* ---- open chat + adaptive polling ---- */
  // Fetch the latest page; reset replaces (chat switch), otherwise merge (poll).
  const loadLatest = useCallback(async (peer: string, reset: boolean) => {
    try {
      const m = await getJson<TgMessage[]>(`scope=messages&peer=${encodeURIComponent(peer)}`);
      setMessages((prev) => (reset ? m : mergeMsgs(prev, m)));
      setError("");
    } catch (e) {
      if (reset) setMessages([]);
      setError((e as Error).message);
    } finally {
      if (reset) setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!openChat) return;
    let alive = true;
    const peer = openChat.id;
    lastIdRef.current = null;
    (async () => { await loadLatest(peer, true); })();
    // Poll only while this chat is open — cheap "almost realtime" without SSE.
    const t = setInterval(() => { if (alive) loadLatest(peer, false); }, CHAT_POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [openChat, loadLatest]);

  // Load an older page and keep the scroll anchored where the user was reading.
  const loadOlder = useCallback(async () => {
    const el = scrollRef.current;
    if (!openChat || !el || olderBusyRef.current || !hasMore || messages.length === 0) return;
    olderBusyRef.current = true;
    setLoadingOlder(true);
    const oldest = messages[0].id;
    try {
      const older = await getJson<TgMessage[]>(`scope=messages&peer=${encodeURIComponent(openChat.id)}&before=${oldest}`);
      if (older.length < PAGE) setHasMore(false);
      if (older.length > 0) {
        prependRef.current = { h: el.scrollHeight, top: el.scrollTop };
        setMessages((prev) => mergeMsgs(prev, older));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      olderBusyRef.current = false;
      setLoadingOlder(false);
    }
  }, [openChat, hasMore, messages]);

  // Object-URL previews for the picked attachments; revoked when they change.
  const previews = useMemo(
    () =>
      attachments.map((f) => {
        const kind: "image" | "video" | "file" = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file";
        return { name: f.name, kind, url: kind === "file" ? null : URL.createObjectURL(f) };
      }),
    [attachments],
  );
  useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews]);

  // Scroll management: preserve position on prepend, pin to bottom on new msgs.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    if (prependRef.current) {
      const { h, top } = prependRef.current;
      prependRef.current = null;
      el.scrollTop = top + (el.scrollHeight - h); // keep the same message under the cursor
      lastIdRef.current = messages[messages.length - 1].id;
      return;
    }
    const last = messages[messages.length - 1].id;
    const isNew = last !== lastIdRef.current;
    const firstLoad = lastIdRef.current === null;
    lastIdRef.current = last;
    if (!isNew) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (firstLoad || nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Sending your own message: always drop to the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pending.length]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80) loadOlder();
  }

  async function send() {
    if (sending || !openChat) return;
    const text = draft.trim();
    const files = attachments;
    if (!text && files.length === 0) return;
    setSending(true);
    const localId = Date.now();
    const note = files.length > 0 ? `📎 ${files.length} ${files.length === 1 ? "файл" : "файла(ов)"}` : undefined;
    setPending((p) => [...p, { localId, text, note }]);
    setDraft("");
    setAttachments([]);
    try {
      if (files.length > 0) {
        const fd = new FormData();
        fd.append("peer", openChat.id);
        fd.append("caption", text);
        files.forEach((f) => fd.append("files", f));
        const r = await fetch("/api/telegram/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      } else {
        const r = await fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peer: openChat.id, text }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      }
      await loadLatest(openChat.id, false);
      setPending((p) => p.filter((x) => x.localId !== localId));
    } catch (e) {
      setError((e as Error).message);
      setPending((p) => p.filter((x) => x.localId !== localId));
      setDraft(text);
      setAttachments(files);
    } finally {
      setSending(false);
    }
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files || []);
    if (fs.length) setAttachments((prev) => [...prev, ...fs]);
    e.target.value = "";
  }

  const openChat_ = openChat;
  return (
    <div className="flex h-full">
      {/* ---- left: chat list ---- */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-vsc-line">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Чаты</span>
          <button
            onClick={forceReload}
            title="Обновить"
            className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2 text-[13px] text-vsc-muted">Загрузка…</p>
          ) : dialogs.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-vsc-muted">Чатов нет.</p>
          ) : (
            dialogs.map((c) => {
              const active = openChat_?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { if (active) return; setMsgLoading(true); setMessages([]); setPending([]); setAttachments([]); setHasMore(true); setError(""); setOpenChat(c); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${active ? "bg-vsc-hover" : "hover:bg-vsc-hover"}`}
                >
                  <KindIcon kind={c.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[13px] ${c.unread > 0 ? "font-semibold text-vsc-bright" : "text-vsc-text"}`}>
                        {c.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-vsc-muted">{when(c.lastDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[12px] text-vsc-muted">{c.lastMessage}</span>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-vsc-accent px-1.5 text-[10px] leading-4 text-white">{c.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ---- right: open chat ---- */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!openChat_ ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-vsc-muted">
            Выбери чат слева, чтобы открыть переписку.
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b border-vsc-line px-6 py-3">
              <KindIcon kind={openChat_.kind} />
              <h2 className="truncate text-[15px] font-semibold text-vsc-bright">{openChat_.title}</h2>
            </header>

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {loadingOlder && <p className="text-center text-[11px] text-vsc-muted">Загрузка истории…</p>}
              {msgLoading ? (
                <p className="text-[13px] text-vsc-muted">Загрузка сообщений…</p>
              ) : messages.length === 0 && pending.length === 0 ? (
                <p className="text-[13px] text-vsc-muted">Сообщений нет.</p>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.out ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-1.5 ${
                          m.out ? "bg-vsc-accent/20 text-vsc-text" : "border border-vsc-line text-vsc-text"
                        }`}
                      >
                        {!m.out && openChat_.kind !== "user" && (
                          <div className="mb-0.5 text-[11px] font-medium text-vsc-muted">{m.author}</div>
                        )}
                        {m.media && <MediaView peer={openChat_.id} msgId={m.id} media={m.media} />}
                        {(m.text || !m.media) && (
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{m.text || "—"}</p>
                        )}
                        <div className="mt-0.5 text-right text-[10px] text-vsc-muted">{when(m.date)}</div>
                      </div>
                    </div>
                  ))}
                  {pending.map((p) => (
                    <div key={p.localId} className="flex justify-end">
                      <div className="max-w-[75%] rounded-lg bg-vsc-accent/10 px-3 py-1.5 opacity-70">
                        {p.note && <div className="mb-0.5 text-[12px] text-vsc-muted">{p.note}</div>}
                        {p.text && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-vsc-text">{p.text}</p>}
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-vsc-muted">
                          <Clock size={10} /> отправка…
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {error && <p className="px-6 text-[12px] text-vsc-yellow">{error}</p>}

            {openChat_.kind !== "channel" && (
              <div className="border-t border-vsc-line px-6 py-3">
                {previews.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {previews.map((p, i) => (
                      <div key={i} className="group relative">
                        {p.kind === "image" && p.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.url} alt="" className="h-16 w-16 rounded object-cover" />
                        ) : p.kind === "video" && p.url ? (
                          <video src={p.url} className="h-16 w-16 rounded object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 flex-col items-center justify-center rounded border border-vsc-line px-1 text-center">
                            <FileText size={18} className="text-vsc-muted" />
                            <span className="mt-0.5 w-full truncate text-[9px] text-vsc-muted">{p.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                          title="Убрать"
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-vsc-bg text-vsc-muted opacity-0 shadow group-hover:opacity-100 hover:text-vsc-text"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" multiple hidden onChange={pickFiles} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Прикрепить файлы"
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded border border-vsc-line text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
                  >
                    <Paperclip size={16} />
                  </button>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Сообщение… (Enter — отправить, Shift+Enter — перенос)"
                    rows={1}
                    className="max-h-32 min-h-[38px] flex-1 resize-none rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
                  />
                  <button
                    onClick={send}
                    disabled={sending || (!draft.trim() && attachments.length === 0)}
                    title="Отправить"
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded bg-vsc-accent text-white hover:opacity-90 disabled:opacity-40"
                  >
                    <Send size={16} className={sending ? "animate-pulse" : ""} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
