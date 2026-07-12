"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, RefreshCw, ArrowLeft, User, Users, Radio, Play } from "lucide-react";
import { getCached, setCached, invalidate } from "@/lib/cache";

/** Client-side mirrors of /api/telegram shapes. */
interface TgDialog { id: string; title: string; kind: "user" | "group" | "channel"; unread: number; lastMessage: string; lastDate: string | null }
interface TgMedia { kind: string; display: "image" | "video" | "audio" }
interface TgMessage { id: number; out: boolean; author: string; text: string; date: string; media: TgMedia | null }

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
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);

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
  const loadMessages = useCallback(async (peer: string, initial: boolean) => {
    try {
      const m = await getJson<TgMessage[]>(`scope=messages&peer=${encodeURIComponent(peer)}`);
      setMessages(m);
      setError("");
    } catch (e) {
      if (initial) setMessages([]);
      setError((e as Error).message);
    } finally {
      if (initial) setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!openChat) return;
    let alive = true;
    const peer = openChat.id;
    lastIdRef.current = null; // reset "seen last message" for the new chat
    (async () => { await loadMessages(peer, true); })();
    // Poll only while this chat is open — cheap "almost realtime" without SSE.
    const t = setInterval(() => { if (alive) loadMessages(peer, false); }, CHAT_POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [openChat, loadMessages]);

  // Auto-scroll only when a genuinely new message arrives (not on every 3s
  // poll of unchanged data), and only if the user is already near the bottom —
  // otherwise reading history / reaching the input box would get yanked away.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    const last = messages[messages.length - 1].id;
    const isNew = last !== lastIdRef.current;
    const firstLoad = lastIdRef.current === null;
    lastIdRef.current = last;
    if (!isNew) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (firstLoad || nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text || !openChat || sending) return;
    setSending(true);
    // Optimistic echo; the next poll reconciles with the real message.
    const optimistic: TgMessage = { id: Date.now(), out: true, author: "Вы", text, date: new Date().toISOString(), media: null };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    try {
      await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer: openChat.id, text }),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`); });
      await loadMessages(openChat.id, false);
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text); // let the user retry
    } finally {
      setSending(false);
    }
  }

  /* ---- open chat view ---- */
  if (openChat) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col px-8 py-5">
        <button
          onClick={() => { setOpenChat(null); setMessages([]); }}
          className="mb-3 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text"
        >
          <ArrowLeft size={15} /> К чатам
        </button>
        <h1 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <KindIcon kind={openChat.kind} /> {openChat.title}
        </h1>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {msgLoading ? (
            <p className="text-[13px] text-vsc-muted">Загрузка сообщений…</p>
          ) : messages.length === 0 ? (
            <p className="text-[13px] text-vsc-muted">Сообщений нет.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.out ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-1.5 ${
                    m.out ? "bg-vsc-accent/20 text-vsc-text" : "border border-vsc-line text-vsc-text"
                  }`}
                >
                  {!m.out && openChat.kind !== "user" && (
                    <div className="mb-0.5 text-[11px] font-medium text-vsc-muted">{m.author}</div>
                  )}
                  {m.media && <MediaView peer={openChat.id} msgId={m.id} media={m.media} />}
                  {(m.text || !m.media) && (
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{m.text || "—"}</p>
                  )}
                  <div className="mt-0.5 text-right text-[10px] text-vsc-muted">{when(m.date)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="mt-2 text-[12px] text-vsc-yellow">{error}</p>}

        {openChat.kind !== "channel" && (
          <div className="mt-3 flex items-end gap-2 border-t border-vsc-line pt-3">
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
              disabled={sending || !draft.trim()}
              title="Отправить"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded bg-vsc-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              <Send size={16} className={sending ? "animate-pulse" : ""} />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ---- dialog list view ---- */
  return (
    <div className="mx-auto max-w-3xl px-8 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <Send size={17} /> Telegram
        </h1>
        <button
          onClick={forceReload}
          title="Обновить"
          className="rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && <p className="mb-3 text-[13px] text-vsc-yellow">{error}</p>}
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка…</p>
      ) : dialogs.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">Чатов нет.</p>
      ) : (
        <div className="divide-y divide-vsc-line">
          {dialogs.map((c) => (
            <button
              key={c.id}
              onClick={() => { setMsgLoading(true); setMessages([]); setOpenChat(c); }}
              className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-vsc-hover"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${c.unread > 0 ? "bg-vsc-accent" : "bg-transparent"}`} />
              <KindIcon kind={c.kind} />
              <span className={`w-44 shrink-0 truncate text-[13px] ${c.unread > 0 ? "font-semibold text-vsc-bright" : "text-vsc-text"}`}>
                {c.title}
              </span>
              <span className="flex-1 truncate text-[13px] text-vsc-muted">{c.lastMessage}</span>
              {c.unread > 0 && (
                <span className="shrink-0 rounded-full bg-vsc-accent px-1.5 text-[11px] leading-5 text-white">{c.unread}</span>
              )}
              <span className="shrink-0 text-[12px] text-vsc-muted">{when(c.lastDate)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
